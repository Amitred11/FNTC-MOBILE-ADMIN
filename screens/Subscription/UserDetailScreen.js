// screens/UserDetailScreen.js
import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, ScrollView, SafeAreaView,
    Image, TouchableOpacity, Modal, TextInput, Platform, UIManager
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Reusable Sub-Components ---

const ProfileHeader = ({ user, theme }) => {
    const styles = getStyles(theme);
    const statusMap = {
        active: { label: 'Active', color: theme.success },
        suspended: { label: 'Suspended', color: theme.warning },
        deactivated: { label: 'Deactivated', color: theme.danger },
    };
    const status = statusMap[user.status] || { label: user.status, color: theme.textSecondary };

    return (
        <Animatable.View animation="fadeInDown" duration={600} style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
                <Image 
                    source={user.photoUrl ? { uri: user.photoUrl } : require('../../assets/images/default-avatar.jpg')} 
                    style={styles.avatar} 
                />
            </View>
            <Text style={styles.displayName}>{user.displayName}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={[styles.statusTag, { backgroundColor: status.color }]}>
                <Text style={styles.statusTagText}>{status.label}</Text>
            </View>
        </Animatable.View>
    );
};

const ActionButton = ({ icon, label, onPress, color, disabled }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: `${color}1A` }, disabled && styles.disabledOpacity]} onPress={onPress} disabled={disabled}>
            <Ionicons name={icon} size={20} color={color || theme.primary} />
            <Text style={[styles.actionButtonLabel, { color: color || theme.primary }]}>{label}</Text>
        </TouchableOpacity>
    );
};

const TabButton = ({ label, icon, isActive, onPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={styles.tabButton} onPress={onPress}>
            <View style={[styles.tabButtonContent, isActive && styles.tabButtonActive]}>
                <Ionicons name={icon} size={20} color={isActive ? theme.primary : theme.textSecondary} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
            </View>
        </TouchableOpacity>
    );
};

const InfoCard = ({ title, children, theme }) => (
    <Animatable.View animation="fadeInUp" duration={500} style={getStyles(theme).infoCard}>
        <Text style={getStyles(theme).infoCardTitle}>{title}</Text>
        {children}
    </Animatable.View>
);

const InfoRow = ({ label, value, theme }) => (
    <View style={getStyles(theme).infoRow}>
        <Text style={getStyles(theme).infoRowLabel}>{label}</Text>
        <Text style={getStyles(theme).infoRowValue} numberOfLines={2}>{value}</Text>
    </View>
);

const ListItem = ({ title, date, status, statusColor, icon, amount, theme, onPress }) => {
    const styles = getStyles(theme);
    return (
        <Animatable.View animation="fadeInUp" duration={500} delay={100}>
            <TouchableOpacity style={styles.listItem} onPress={onPress}>
                <View style={[styles.itemIconContainer, { backgroundColor: `${statusColor}20` }]}>
                    <Ionicons name={icon} size={22} color={statusColor} />
                </View>
                <View style={styles.itemTextContainer}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.itemDate}>{date}</Text>
                </View>
                <View style={styles.itemStatusContainer}>
                    {amount && <Text style={styles.itemAmount}>{amount}</Text>}
                    <Text style={[styles.itemStatus, { color: statusColor }]}>{status}</Text>
                </View>
            </TouchableOpacity>
        </Animatable.View>
    );
};

// --- Main Screen Component ---
export default function UserDetailScreen({ route, navigation }) {
    const { userId } = route.params;
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    // --- State Management ---
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Overview');
    const [isActionLoading, setIsActionLoading] = useState({ modem: false, status: false, delete: false });
    const [isStatusModalVisible, setStatusModalVisible] = useState(false);
    const [reason, setReason] = useState('');
    const [targetStatus, setTargetStatus] = useState('');

    // --- Data Fetching ---
    const fetchUserDetails = useCallback(async () => {
        if (!isLoading) setIsLoading(true);
        try {
            const { data: userData } = await api.get(`/admin/users/${userId}/details`);
            setData(userData);
        } catch (error) {
            showAlert("Error", "Could not fetch user details.", [{ text: "OK", onPress: () => navigation.goBack() }]);
        } finally { 
            setIsLoading(false); 
        }
    }, [userId, navigation, showAlert, isLoading]);

    useEffect(() => { 
        fetchUserDetails(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    useLayoutEffect(() => {
        if (data?.user?.displayName) {
            navigation.setOptions({ title: data.user.displayName });
        }
    }, [navigation, data]);
    
    // --- Handler Functions ---

    const handleToggleModem = () => {
        const user = data.user;
        const actionText = user.isModemInstalled ? 'RETRIEVED' : 'INSTALLED';
        showAlert("Confirm Action", `Are you sure you want to mark the modem for ${user.displayName} as ${actionText}?`, [
            { text: "Cancel", style: "cancel" },
            { text: `Confirm ${actionText}`, onPress: async () => {
                setIsActionLoading(prev => ({ ...prev, modem: true }));
                try {
                    const response = await api.post(`/admin/users/${user._id}/toggle-modem`);
                    setData(prevData => ({ ...prevData, user: response.data.user }));
                    showAlert("Success", "Modem status has been updated.");
                } catch (error) {
                    showAlert("Error", error.response?.data?.message || "Failed to update modem status.");
                } finally {
                    setIsActionLoading(prev => ({ ...prev, modem: false }));
                }
            }}
        ]);
    };

    const openStatusModal = (newStatus) => {
        setTargetStatus(newStatus);
        setReason('');
        setStatusModalVisible(true);
    };

    const handleUpdateStatus = async (newStatus, newReason = '') => {
        if ((newStatus === 'suspended' || newStatus === 'deactivated') && !newReason.trim()) {
            return showAlert("Reason Required", `Please provide a reason to ${newStatus} the user.`);
        }
        setIsActionLoading(prev => ({ ...prev, status: true }));
        setStatusModalVisible(false);
        try {
            const response = await api.post(`/admin/users/${userId}/status`, { status: newStatus, reason: newReason });
            setData(prevData => ({ ...prevData, user: response.data.user }));
            showAlert("Success", `User status has been updated to '${newStatus}'.`);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to update user status.");
        } finally {
            setIsActionLoading(prev => ({ ...prev, status: false }));
        }
    };
    
    const handleDeleteUser = () => {
        showAlert( "⚠️ PERMANENTLY DELETE USER ⚠️", `You are about to delete '${data.user.displayName}' and ALL of their associated data. This action is irreversible.`, [ { text: "Cancel", style: "cancel" }, { text: "I Understand, Delete Forever", style: 'destructive', onPress: async () => { setIsActionLoading(prev => ({ ...prev, delete: true })); try { const response = await api.delete(`/admin/users/${userId}`); showAlert("Success", response.data.message, [ { text: "OK", onPress: () => navigation.goBack() } ]); } catch (error) { showAlert("Error", error.response?.data?.message || "Failed to delete user."); setIsActionLoading(prev => ({ ...prev, delete: false })); } } } ] );
    };
    
    // --- Render Logic ---
    if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    if (!data) return <View style={styles.centered}><Text style={{color: theme.text}}>No data found for this user.</Text></View>;
    
    const { user, subscriptions, bills, tickets } = data;
    const isDeactivated = user.status === 'deactivated';
    const isActive = user.status === 'active';
    const isSuspended = user.status === 'suspended';
    const activeSubscription = subscriptions.find(s => s.status === 'active' || s.status === 'suspended');

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} stickyHeaderIndices={[1]}>
                <ProfileHeader user={user} theme={theme} />
                
                <View style={styles.stickyHeader}>
                    <Text style={styles.actionsTitle}>Quick Actions</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsGrid}>
                        {isActive && <ActionButton icon="ban-outline" label="Suspend" color={theme.warning} disabled={isDeactivated || isActionLoading.status} onPress={() => openStatusModal('suspended')} />}
                        {isSuspended && <ActionButton icon="checkmark-circle-outline" label="Unsuspend" color={theme.success} disabled={isDeactivated || isActionLoading.status} onPress={() => handleUpdateStatus('active')} />}
                        <ActionButton icon="trash-outline" label="Delete" color={theme.danger} disabled={isDeactivated || isActionLoading.delete} onPress={handleDeleteUser} />
                    </ScrollView>
                    <View style={styles.tabContainer}>
                        <TabButton label="Overview" icon="person-circle-outline" isActive={activeTab === 'Overview'} onPress={() => setActiveTab('Overview')} />
                        <TabButton label="Billing" icon="receipt-outline" isActive={activeTab === 'Billing'} onPress={() => setActiveTab('Billing')} />
                        <TabButton label="Tickets" icon="headset-outline" isActive={activeTab === 'Tickets'} onPress={() => setActiveTab('Tickets')} />
                    </View>
                </View>

                <View style={styles.contentContainer}>
                    {activeTab === 'Overview' && (
                        <>
                            <InfoCard title="Current Subscription" theme={theme}>
                                {activeSubscription ? (
                                    <>
                                        <InfoRow label="Plan" value={activeSubscription.planId?.name} theme={theme} />
                                        <InfoRow label="Start Date" value={new Date(activeSubscription.startDate).toLocaleDateString()} theme={theme} />
                                        <InfoRow label="Next Renewal" value={new Date(activeSubscription.renewalDate).toLocaleDateString()} theme={theme} />
                                    </>
                                ) : <Text style={styles.emptyTabText}>No active subscription.</Text>}
                            </InfoCard>
                            <InfoCard title="Contact Information" theme={theme}>
                                <InfoRow label="Mobile No" value={user.profile?.mobileNumber || 'N/A'} theme={theme} />
                                <InfoRow label="Address" value={`${user.profile?.address || 'N/A'} ${user.profile?.city || 'N/A'} ${user.profile?.province || 'N/A'}`} theme={theme} />
                            </InfoCard>
                        </>
                    )}
                    {activeTab === 'Billing' && (
                         <>
                            {bills.length > 0 ? bills.map(item => <ListItem 
                                key={item._id} theme={theme} onPress={() => navigation.navigate('BillDetail', { billId: item._id })}
                                icon="receipt-outline" title={item.planName || 'Manual Bill'} date={`Due: ${new Date(item.dueDate).toLocaleDateString()}`}
                                status={item.status} amount={`₱${item.amount.toFixed(2)}`}
                                statusColor={{ 'Paid': theme.success, 'Voided': theme.danger, 'Overdue': theme.danger, 'Pending Verification': theme.warning }[item.status] || theme.primary}
                            />) : <Text style={styles.emptyTabText}>No recent bills found.</Text>}
                        </>
                    )}
                    {activeTab === 'Tickets' && (
                        <>
                            {tickets.length > 0 ? tickets.map(item => <ListItem
                                key={item._id} theme={theme} onPress={() => navigation.navigate('TicketDetail', { ticketId: item._id })}
                                icon="headset-outline" title={item.subject} date={`Last Update: ${new Date(item.updatedAt).toLocaleDateString()}`}
                                status={item.status} statusColor={{ 'Closed': theme.textSecondary, 'Resolved': theme.success, 'In Progress': theme.accent }[item.status] || theme.warning}
                            />) : <Text style={styles.emptyTabText}>No recent tickets found.</Text>}
                        </>
                    )}
                </View>
            </ScrollView>
            
            {/* --- Modals --- */}
            <Modal animationType="fade" transparent={true} visible={isStatusModalVisible} onRequestClose={() => setStatusModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Animatable.View animation="zoomIn" duration={300} style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1)} User</Text>
                        <TextInput style={styles.modalInput} placeholder={`Reason for ${targetStatus}...`} value={reason} onChangeText={setReason} />
                        <TouchableOpacity style={[styles.modalButton, isActionLoading.status && styles.disabledOpacity]} onPress={() => handleUpdateStatus(targetStatus, reason)} disabled={isActionLoading.status}>
                            {isActionLoading.status ? <ActivityIndicator color={theme.background} /> : <Text style={styles.modalButtonText}>Confirm</Text>}
                        </TouchableOpacity>
                         <TouchableOpacity style={styles.modalCancelButton} onPress={() => setStatusModalVisible(false)}>
                            <Text style={styles.modalCancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </Animatable.View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// --- Styles ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background  },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    scrollContainer: { paddingBottom: 50 },
    
    profileHeader: { alignItems: 'center', paddingVertical: 24, backgroundColor: theme.surface, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, },
    avatarContainer: {
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
        borderRadius: 50, boxShadow: '2px 4px 2px rgba(0,0,0,0.4)'
    },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: theme.primary },
    displayName: { fontSize: 26, fontWeight: '700', color: theme.text, marginTop: 16 },
    email: { fontSize: 16, color: theme.textSecondary, marginTop: 4, marginBottom: 16 },
    statusTag: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    statusTagText: { color: theme.white, fontSize: 12, fontWeight: 'bold' },
    
    stickyHeader: { backgroundColor: theme.background, paddingTop: 10, },
    actionsTitle: { fontSize: 16, fontWeight: '600', color: theme.textSecondary, paddingHorizontal: 20, marginBottom: 10, },
    actionsGrid: { flexDirection: 'row', paddingHorizontal: 15, paddingBottom: 15, gap: 10, },
    actionButton: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, boxShadow: '2px 4px 2px rgba(0,0,0,0.4)'
    },
    actionButtonLabel: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
    disabledOpacity: { opacity: 0.5 },

    tabContainer: {
        flexDirection: 'row', justifyContent: 'space-around',
        backgroundColor: theme.surface, marginHorizontal: 15, borderRadius: 15,
        paddingVertical: 5,
        boxShadow: '2px 4px 2px rgba(0,0,0,0.4)'
    },
    tabButton: { flex: 1, alignItems: 'center' },
    tabButtonContent: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12,
    },
    tabButtonActive: { backgroundColor: `${theme.primary}20` },
    tabLabel: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginLeft: 6 },
    tabLabelActive: { color: theme.primary },

    contentContainer: { padding: 15, paddingTop: 20 },
    infoCard: {
        backgroundColor: theme.surface, borderRadius: 16, padding: 20, marginBottom: 15,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    },
    infoCardTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 15, },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    infoRowLabel: { fontSize: 15, color: theme.textSecondary, flex: 1 },
    infoRowValue: { fontSize: 15, color: theme.text, fontWeight: '500', flex: 1.5, textAlign: 'right' },

    listItem: {
        backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center',
        padding: 15, borderRadius: 16, marginBottom: 12,
        boxShadow: '2px 4px 2px rgba(0,0,0,0.4)'
    },
    itemIconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    itemTextContainer: { flex: 1, marginRight: 10 },
    itemTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
    itemDate: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
    itemStatusContainer: { alignItems: 'flex-end' },
    itemAmount: { fontSize: 15, fontWeight: 'bold', color: theme.text },
    itemStatus: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    emptyTabText: { textAlign: 'center', color: theme.textSecondary, fontStyle: 'italic', fontSize: 15, paddingVertical: 40 },

    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
    modalContent: { width: '100%', backgroundColor: theme.surface, borderRadius: 20, padding: 25 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 20, textAlign: 'center' },
    modalInput: { backgroundColor: theme.background, color: theme.text, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: theme.border, fontSize: 16, marginBottom: 20 },
    modalButton: { backgroundColor: theme.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 5 },
    modalButtonText: { color: theme.white, fontSize: 16, fontWeight: 'bold' },
    modalCancelButton: { padding: 15, borderRadius: 10, alignItems: 'center' },
    modalCancelButtonText: { color: theme.textSecondary, fontSize: 16, fontWeight: '500' },
});