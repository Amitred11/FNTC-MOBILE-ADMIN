import React, { useState, useCallback, useMemo } from 'react';
import { 
    View, 
    Text, 
    FlatList, 
    ActivityIndicator, 
    StyleSheet, 
    RefreshControl, 
    Modal, 
    TextInput, 
    SafeAreaView,
    TouchableOpacity
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import { UserActionCard } from '../../components/UserActionCard';

// --- [UPDATED] Helper function to group all items by user ---
const groupDataByUser = (pendingSubs, allBills) => {
    const userActionMap = {};

    const getInitialisedUser = (item) => {
        const userId = item.userId?._id;
        if (!userId) return null;

        if (!userActionMap[userId]) {
            userActionMap[userId] = {
                user: item.userId,
                actions: {
                    pendingApplications: [],   
                    pendingInstallations: [],
                    pendingPlanChanges: [],
                    pendingPaymentVerifications: [],
                    unpaidBills: [],
                },
            };
        }
        return userActionMap[userId];
    };

    // Group pending subscriptions and find their initial bills
    pendingSubs.forEach(sub => {
        const userGroup = getInitialisedUser(sub);
        if (!userGroup) return;

        if (sub.status === 'pending_verification') {
            userGroup.actions.pendingApplications.push(sub);
        } else if (sub.status === 'pending_installation') {
            // Directly find and attach the initial bill to the subscription object
            const initialBill = allBills.find(bill => 
                bill.subscriptionId === sub._id.toString() && bill.status === 'Upcoming'
            );
            if (initialBill) {
                sub.initialBill = initialBill; // Attach for use in the card
            }
            userGroup.actions.pendingInstallations.push(sub);
        } else if (sub.status === 'pending_change') {
            userGroup.actions.pendingPlanChanges.push(sub);
        }
    });

    // Group bills
    allBills.forEach(bill => {
        const userGroup = getInitialisedUser(bill);
        if (!userGroup) return;

        if (bill.status === 'Upcoming' && new Date(bill.dueDate) < new Date()) {
            if (!userGroup.actions.stuckUpcomingBills) {
                userGroup.actions.stuckUpcomingBills = [];
            }
            userGroup.actions.stuckUpcomingBills.push(bill);
        } 

        if (bill.status === 'Pending Verification') {
            userGroup.actions.pendingPaymentVerifications.push(bill);
        } else if (['Due', 'Overdue'].includes(bill.status)) {
            userGroup.actions.unpaidBills.push(bill);
        }
    });

    return Object.values(userActionMap);
};


export default function SubscriptionManagementScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    const navigation = useNavigation();
    
    const [masterData, setMasterData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal State
    const [isDeclineModalVisible, setDeclineModalVisible] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);

    const totalActions = useMemo(() => masterData.reduce((acc, userGroup) => {
        return acc + Object.values(userGroup.actions).reduce((sum, actionArray) => sum + actionArray.length, 0);
    }, 0), [masterData]);

    // --- [UPDATED] Simplified fetchData logic ---
    const fetchData = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const [subsResponse, billsResponse] = await Promise.all([
                api.get('/admin/subscriptions/pending'),
                api.get('/admin/bills') 
            ]);

            const pendingSubs = subsResponse.data || [];
            const allBills = billsResponse.data || []; // Assuming the endpoint returns an array of bills

            const groupedData = groupDataByUser(pendingSubs, allBills);

            setMasterData(groupedData);
            setFilteredData(groupedData);

        } catch (error) {
            console.error("Fetch Data Error:", error.response?.data || error.message);
            showAlert("Error", "Could not fetch management data.", [{ text: "OK" }]);
        } finally {
            if (showLoader) setIsLoading(false);
            setRefreshing(false);
        }
    }, [showAlert]);

    useFocusEffect(useCallback(() => { fetchData(true); }, [fetchData]));
    
    React.useEffect(() => {
        if (!searchQuery) {
            setFilteredData(masterData);
            return;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        const data = masterData.filter(item => 
            (item.user?.displayName?.toLowerCase().includes(lowercasedQuery)) ||
            (item.user?.email?.toLowerCase().includes(lowercasedQuery))
        );
        setFilteredData(data);
    }, [searchQuery, masterData]);

    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(false); }, [fetchData]);
    
    const navigateToUser = (userId) => navigation.navigate('UserDetail', { userId });
    const navigateToBill = (billId) => navigation.navigate('BillDetail', { billId });

    const handleApproveVerification = (sub) => {
        showAlert("Confirm Verification", `This will approve the application for '${sub.userId?.displayName}' and create an installation job order.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm & Create Job", onPress: async () => {
                try {
                    await api.post(`/admin/subscriptions/${sub._id}/approve-verification`);
                    showAlert("Success", "Application verified and job order created!");
                    fetchData(false);
                } catch (error) {
                    showAlert("Error", error.response?.data?.message || "Could not verify application.");
                }
            }}
        ]);
    };

    const handleActivateSubscription = (sub) => {
        showAlert("Confirm Activation", `This will fully activate the subscription for '${sub.userId?.displayName}'. Only do this after the installation is confirmed complete.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm & Activate", style: "destructive", onPress: async () => {
                try {
                    await api.post(`/admin/subscriptions/${sub._id}/activate`); // Assuming endpoint is /activate
                    showAlert("Success", "Subscription activated!");
                    fetchData(false);
                } catch (error) {
                    showAlert("Error", error.response?.data?.message || "Could not activate subscription.");
                }
            }}
        ]);
    };

    const handleMarkAsDue = (bill) => {
        showAlert("Confirm Action", `This will manually mark the bill for '${bill.userId?.displayName}' as DUE. Only do this if the system failed to do so automatically.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm & Mark Due", onPress: async () => {
                try {
                    await api.post(`/admin/bills/${bill._id}/mark-due`);
                    showAlert("Success", "Bill has been marked as DUE.");
                    fetchData(false);
                } catch (error) {
                    showAlert("Error", error.response?.data?.message || "Could not mark bill as due.");
                }
            }}
        ]);
    };

    const handleApprovePlanChange = (sub, isScheduled) => {
        const actionText = isScheduled ? `schedule the change for next renewal` : "change the plan immediately";
        showAlert("Confirm Plan Change", `This will ${actionText} for '${sub.userId?.displayName}'.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: async () => {
                try {
                    await api.post(`/admin/subscriptions/${sub._id}/approve-change`, { scheduleForRenewal: isScheduled });
                    showAlert("Success", "Plan change processed!");
                    fetchData(false);
                } catch (error) {
                    showAlert("Error", error.response?.data?.message || "Could not process plan change.");
                }
            }}
        ]);
    };

    const openDeclineModal = (item) => { 
        setSelectedItem(item); 
        setDeclineReason(''); 
        setDeclineModalVisible(true); 
    };
    
    const submitDecline = async () => {
        if (!declineReason.trim()) return showAlert("Error", "A reason for declining is required.");
        setDeclineModalVisible(false);
        try {
            await api.post(`/admin/subscriptions/${selectedItem._id}/decline`, { reason: declineReason });
            showAlert("Success", "The request has been declined.");
            fetchData(false);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to decline request.");
        }
    };

    if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    
    // The rest of the component's JSX (SafeAreaView, FlatList, Modal) remains the same
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Action Inbox</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('PlanManagement')}>
                        <Ionicons name="options-outline" size={28} color={theme.text} />
                    </TouchableOpacity>
                </View>


                <Text style={styles.headerSubtitle}>{totalActions} pending action{totalActions !== 1 && 's'} found</Text>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by user name or email..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.user._id}
                renderItem={({ item }) => (
                    <UserActionCard 
                        item={item} theme={theme}
                        onNavigateToUser={navigateToUser} onNavigateToBill={navigateToBill}
                        onApproveVerification={handleApproveVerification}
                        onActivateSub={handleActivateSubscription}
                        onApprovePlanChange={handleApprovePlanChange}
                        onDecline={openDeclineModal}
                        onMarkAsDue={handleMarkAsDue}
                    />
                )}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="checkmark-done-circle-outline" size={60} color={theme.success} />
                        <Text style={styles.emptyText}>All Clear!</Text>
                        <Text style={styles.emptySubtext}>There are no pending actions at this time.</Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
            />
            
            <Modal animationType="fade" transparent={true} visible={isDeclineModalVisible} onRequestClose={() => setDeclineModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Ionicons name="close-circle-outline" size={40} color={theme.danger} style={{ marginBottom: 10 }} />
                        <Text style={styles.modalTitle}>Decline Reason</Text>
                        <Text style={styles.modalSubtitle}>This reason will be sent to the user.</Text>
                        <TextInput style={styles.modalInput} placeholder="e.g., Incomplete address..." placeholderTextColor={theme.textSecondary} value={declineReason} onChangeText={setDeclineReason} multiline />
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setDeclineModalVisible(false)}><Text style={styles.modalCancelButtonText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmButton} onPress={submitDecline}><Text style={styles.modalConfirmButtonText}>Submit Decline</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: theme.surface,
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4, // Space between title row and subtitle
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.text,
    },
    headerSubtitle: {
        fontSize: 16,
        color: theme.textSecondary,
        marginBottom: 15,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
    },
    searchIcon: {
        marginHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        height: 45,
        color: theme.text,
        fontSize: 16,
    },
    listContainer: {
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 40,
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
        marginTop: 15,
    },
    emptySubtext: {
        fontSize: 15,
        color: theme.textSecondary,
        marginTop: 5,
        textAlign: 'center',
        maxWidth: '80%',
    },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
    modalContent: { width: '100%', backgroundColor: theme.surface, borderRadius: 16, padding: 20, alignItems: 'center' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 5 },
    modalSubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 20 },
    modalInput: { width: '100%', minHeight: 100, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, textAlignVertical: 'top', color: theme.text, marginBottom: 20, fontSize: 16 },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, width: '100%' },
    modalCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    modalConfirmButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: theme.danger },
    modalCancelButtonText: { color: theme.text, fontWeight: 'bold' },
    modalConfirmButtonText: { color: theme.textOnPrimary, fontWeight: 'bold' },
});