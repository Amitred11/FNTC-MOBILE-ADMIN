// screens/Subscription/SubscriptionUserScreen.js

import React, {useState, useCallback, useEffect} from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import UpdatePlanModal from './components/UpdatePlanModal';
import SuspendSubscriptionModal from './components/SuspendSubscriptionModal';
import CancelReasonModal from './components/CancelReasonModal';

const SUBSCRIPTION_STATUS = Object.freeze({
    ACTIVE: 'active',
    PENDING_VERIFICATION: 'pending_verification',
    PENDING_INSTALLATION: 'pending_installation',
    PENDING_CHANGE: 'pending_change',
    DECLINED: 'declined',
    CANCELLED: 'cancelled',
    SUSPENDED: 'suspended'
});


const StatCard = ({ icon, title, value, color, theme }) => {
    const styles = getStyles(theme);
    return (
        <View style={styles.statCard}>
            <Ionicons name={icon} size={28} color={color} style={styles.statCardIcon} />
            <View>
                <Text style={styles.statCardTitle}>{title}</Text>
                <Text style={[styles.statCardValue, { color: color }]}>{value}</Text>
            </View>
        </View>
    );
};

const HistoryListItem = ({ item, theme, onNavigate }) => {
    const styles = getStyles(theme);
    const statusMap = {
        Paid: { color: theme.success, icon: 'checkmark-circle-outline' },
        Active: { color: theme.success, icon: 'play-circle-outline' },
        Due: { color: theme.danger, icon: 'alert-circle-outline' },
        Overdue: { color: theme.danger, icon: 'warning-outline' },
        Cancelled: { color: theme.textSecondary, icon: 'close-circle-outline' },
        Voided: { color: theme.textSecondary, icon: 'remove-circle-outline' },
    };
    const { color, icon } = statusMap[item.status] || { color: theme.primary, icon: 'receipt-outline' };

    return (
        <TouchableOpacity style={styles.historyItem} onPress={onNavigate}>
            <View style={[styles.historyItemIconWrapper, { backgroundColor: `${color}1A` }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View style={styles.historyItemDetails}>
                <Text style={styles.historyItemTitle}>{item.planName || 'Billing Adjustment'}</Text>
                <Text style={styles.historyItemDate}>{new Date(item.statementDate).toLocaleDateString()}</Text>
            </View>
            <View style={styles.historyItemAmountContainer}>
                <Text style={styles.historyItemAmount}>₱{item.amount.toFixed(2)}</Text>
                <Text style={[styles.historyItemStatus, { color: color }]}>{item.status}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
    );
};

const ActionButton = ({ icon, label, onPress, theme, type = 'primary' }) => {
    const styles = getStyles(theme);
    const colorMap = {
        primary: theme.primary,
        secondary: theme.textSecondary,
        destructive: theme.danger,
        success: theme.success
    };
    const color = colorMap[type];

    return (
        <TouchableOpacity style={[styles.actionButton, { borderColor: color }]} onPress={onPress}>
            <Ionicons name={icon} size={20} color={color} />
            <Text style={[styles.actionButtonText, { color: color }]}>{label}</Text>
        </TouchableOpacity>
    );
};


// --- Main Screen Component ---

export default function SubscriptionUserScreen({ route, navigation }) {
    const { userId } = route.params;
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [isUpdateModalVisible, setUpdateModalVisible] = useState(false);
    const [isSuspendModalVisible, setSuspendModalVisible] = useState(false);
    const [isCancelReasonModalVisible, setCancelReasonModalVisible] = useState(false); // New state for cancellation modal

    const fetchDetails = useCallback(async () => {
        if (!userId) return;
        try {
            const response = await api.get(`/admin/users/${userId}/details`);
            setData(response.data);
        } catch (error) {
            console.error("Fetch Error:", error.response?.data || error.message);
            showAlert("Error", "Could not fetch subscriber details.");
        } finally {
            setIsLoading(false);
        }
    }, [userId, showAlert]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchDetails();
        setIsRefreshing(false);
    }, [fetchDetails]);

    useEffect(() => {
        setIsLoading(true);
        fetchDetails();
    }, [fetchDetails]);

    // --- Action Handlers ---

    const performDecline = async (subscriptionId, reason) => {
        try {
            await api.post(`/admin/subscriptions/${subscriptionId}/decline`, { reason });
            showAlert("Success", "Subscription has been declined.");
            handleRefresh();
        } catch (error) {
            showAlert("Error", "Failed to decline subscription.");
        }
    };

    const showDeclineReasonPrompt = (subscriptionId) => {
        showAlert(
            "Provide Decline Reason",
            "Please provide a reason for declining this application.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Submit",
                    onPress: (reason) => {
                        if (reason && reason.trim() !== '') {
                            performDecline(subscriptionId, reason);
                        } else {
                            showAlert("Input Required", "A reason is required to decline.");
                        }
                    },
                    style: "destructive"
                }
            ],
            { type: 'prompt' }
        );
    };

    const handleDeclinePress = (subscriptionId) => {
        showAlert(
            "Confirm Decline",
            "Are you sure you want to decline this application?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () => showDeclineReasonPrompt(subscriptionId),
                    style: "destructive"
                }
            ]
        );
    };
    
    const performApproveVerification = async (subscriptionId) => {
        try {
            await api.post(`/admin/subscriptions/${subscriptionId}/approve-verification`);
            showAlert("Success", "Application verified. A job order for installation has been created.");
            handleRefresh();
        } catch (error) {
            showAlert("Error", "Failed to approve verification.");
        }
    };
    
    const handleApproveVerificationPress = (subscriptionId) => {
        showAlert(
            "Confirm Approval",
            "Approving this will create an installation job order. Proceed?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () => performApproveVerification(subscriptionId),
                }
            ]
        );
    };

    const performActivateInstallation = async (subscriptionId) => {
        try {
            await api.post(`/admin/subscriptions/${subscriptionId}/activate`);
            showAlert("Success", "Subscription has been activated.");
            handleRefresh();
        } catch (error) {
            showAlert("Error", "Failed to activate subscription.");
        }
    };

    const handleActivateInstallationPress = (subscriptionId) => {
        showAlert(
            "Confirm Activation",
            "This will activate the user's subscription and generate their first bill. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm & Activate",
                    onPress: () => performActivateInstallation(subscriptionId),
                }
            ]
        );
    };

    const performApprovePlanChange = async (subscriptionId, scheduleForRenewal) => {
        try {
            await api.post(`/admin/subscriptions/${subscriptionId}/approve-change`, { scheduleForRenewal });
            showAlert("Success", `Plan change has been ${scheduleForRenewal ? 'scheduled' : 'applied immediately'}.`);
            handleRefresh();
        } catch (error) {
            showAlert("Error", "Failed to approve plan change.");
        }
    };
    
    const handleApprovePlanChangePress = (subscriptionId, scheduleForRenewal) => {
        showAlert(
            "Confirm Plan Change",
            `Are you sure you want to approve this plan change? It will be ${scheduleForRenewal ? 'scheduled for the next renewal' : 'effective immediately'}.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () => performApprovePlanChange(subscriptionId, scheduleForRenewal),
                }
            ]
        );
    };

    const performCancellation = async (reason) => {
        setCancelReasonModalVisible(false); 
        if (!reason || reason.trim() === '') {
            showAlert("Input Required", "A reason is required to cancel the subscription.");
            return;
        }

        try {
            await api.post(`/admin/subscriptions/${data?.activeSubscription?._id}/cancel`, { reason });
            showAlert("Success", "Subscription has been cancelled.");
            handleRefresh();
        } catch (error) {
            console.error("Cancellation Error:", error.response?.data || error.message); 
            showAlert("Error", error.response?.data?.message || "Failed to cancel subscription.");
        }
    };

    const handleCancelPress = () => {
        if (!data?.activeSubscription?._id) {
            showAlert("Error", "No active subscription found to cancel.");
            return;
        }
        setCancelReasonModalVisible(true);
    };
    
    const handleUnsuspendPress = () => {
        showAlert(
            "Confirm Reactivation",
            "Are you sure you want to reactivate this subscription?",
            [
                { text: "Dismiss", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: performUnsuspend,
                    style: "default"
                }
            ]
        );
    };

    const performUnsuspend = async () => {
        try {
            await api.post(`/admin/subscriptions/${data?.activeSubscription?._id}/unsuspend`);
            showAlert("Success", "Subscription has been reactivated.");
            handleRefresh();
        } catch (error) {
            showAlert("Error", "Failed to reactivate subscription.");
        }
    };


    const renderPendingStateUI = (subscription) => {
        const status = subscription.status;
        const plan = subscription.planId;
        const pendingPlan = subscription.pendingPlanId;

        let title, description, actions;

        switch (status) {
            case SUBSCRIPTION_STATUS.PENDING_VERIFICATION:
                title = "Pending Verification";
                description = `User has applied for the "${plan?.name}" plan. Please review their documents and approve or decline the application.`;
                actions = (
                    <View style={styles.actionsContainer}>
                        <ActionButton icon="checkmark-circle-outline" label="Approve" theme={theme} type="success" onPress={() => handleApproveVerificationPress(subscription._id)} />
                        <ActionButton icon="close-circle-outline" label="Decline" theme={theme} type="destructive" onPress={() => handleDeclinePress(subscription._id)} />
                    </View>
                );
                break;

            case SUBSCRIPTION_STATUS.PENDING_INSTALLATION:
                title = "Pending Installation";
                description = `Application for the "${plan?.name}" plan is approved. Awaiting confirmation of modem installation to activate the service.`;
                actions = (
                    <View style={styles.actionsContainer}>
                        <ActionButton icon="play-circle-outline" label="Activate Service" theme={theme} type="success" onPress={() => handleActivateInstallationPress(subscription._id)} />
                    </View>
                );
                break;
                
            case SUBSCRIPTION_STATUS.PENDING_CHANGE:
                title = "Pending Plan Change";
                description = `User requested to change from "${plan?.name}" to "${pendingPlan?.name}". Approve to apply immediately or schedule it for the next renewal date.`;
                actions = (
                    <View style={styles.actionsContainer}>
                        <ActionButton icon="flash-outline" label="Apply Now" theme={theme} type="primary" onPress={() => handleApprovePlanChangePress(subscription._id, false)} />
                        <ActionButton icon="calendar-outline" label="Schedule" theme={theme} type="secondary" onPress={() => handleApprovePlanChangePress(subscription._id, true)} />
                        <ActionButton icon="close-circle-outline" label="Decline" theme={theme} type="destructive" onPress={() => handleDeclinePress(subscription._id)} />
                    </View>
                );
                break;
            default:
                title = "Unknown Status";
                description = "This subscription is in an unknown or unhandled pending state.";
                actions = null;
                break;
        }

        return (
            <Animatable.View animation="fadeInUp" duration={500} style={styles.card}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.pendingDescription}>{description}</Text>
                {actions}
            </Animatable.View>
        );
    };

    // --- Main Render Logic ---

    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }
    
    if (!data || !data.user) { 
        return <View style={styles.centered}><Text style={styles.errorText}>No data available for this user or user not found.</Text></View>;
    }
    
    const { user, activeSubscription, billingHistory, currentBalance } = data;
    const plan = activeSubscription?.planId;
    const initials = user.displayName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
    
    const isPending = activeSubscription && [
        SUBSCRIPTION_STATUS.PENDING_VERIFICATION, 
        SUBSCRIPTION_STATUS.PENDING_INSTALLATION, 
        SUBSCRIPTION_STATUS.PENDING_CHANGE
    ].includes(activeSubscription.status);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Animatable.View animation="fadeInDown" duration={600} style={styles.card}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatar}>
                            {user.photoUrl ? (
                                <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarText}>{initials}</Text>
                            )}
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.userName}>{user.displayName}</Text>
                            <Text style={styles.userInfo}>{user.email}</Text>
                        </View>
                    </View>
                    
                    {!isPending && activeSubscription && (
                         <View style={styles.actionsContainer}>
                            <ActionButton icon="swap-horizontal-outline" label="Update" theme={theme} type="primary" onPress={() => setUpdateModalVisible(true)} />
                            <ActionButton icon="close-circle-outline" label="Cancel" theme={theme} type="secondary" onPress={handleCancelPress} /> 
                            {activeSubscription?.status === 'suspended' ? (
                                <ActionButton icon="play-circle-outline" label="Unsuspend" theme={theme} type="success" onPress={handleUnsuspendPress} />
                            ) : (
                                <ActionButton icon="pause-circle-outline" label="Suspend" theme={theme} type="destructive" onPress={() => setSuspendModalVisible(true)} />
                            )}
                        </View>
                    )}
                </Animatable.View>

                {isPending ? (
                    renderPendingStateUI(activeSubscription)
                ) : (
                    <>
                        {/* --- Overview Section --- */}
                        <Animatable.View animation="fadeInUp" duration={500} delay={100} style={styles.card}>
                            <Text style={styles.sectionTitle}>Subscription Overview</Text>
                            <View style={styles.statsGrid}>
                                <StatCard theme={theme} icon="cash-outline" title="Current Balance" value={`₱${currentBalance?.toFixed(2) || '0.00'}`} color={(currentBalance || 0) > 0 ? theme.danger : theme.success} />
                                <StatCard theme={theme} icon="wifi-outline" title="Active Plan" value={plan?.name || 'N/A'} color={theme.primary} />
                                <StatCard theme={theme} icon="wallet-outline" title="Monthly Price" value={`₱${plan?.price?.toFixed(2) || '0.00'}`} color={theme.accent} />
                                <StatCard theme={theme} icon="shield-checkmark-outline" title="Status" value={activeSubscription?.status || 'Inactive'} color={activeSubscription?.status === 'active' ? theme.success : theme.warning} />
                            </View>
                        </Animatable.View>

                        {/* --- History Section --- */}
                        <Animatable.View animation="fadeInUp" duration={500} delay={200} style={styles.card}>
                            <Text style={styles.sectionTitle}>Billing History</Text>
                            {billingHistory && billingHistory.length > 0 ? (
                                <View>
                                    {billingHistory.map(item => (
                                        <HistoryListItem key={item._id} item={item} theme={theme} onNavigate={() => navigation.navigate('BillDetail', { billId: item._id })} />
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.noHistoryContainer}>
                                <Ionicons name="documents-outline" size={40} color={theme.textSecondary} />
                                <Text style={styles.noHistoryText}>No billing history found.</Text>
                                </View>
                            )}
                        </Animatable.View>
                    </>
                )}

            </ScrollView>
            
            {/* --- Modals for Active/Suspended states --- */}
            {activeSubscription && !isPending && (
                <>
                    <UpdatePlanModal
                        theme={theme}
                        isVisible={isUpdateModalVisible}
                        onClose={() => setUpdateModalVisible(false)}
                        subscription={activeSubscription}
                        onComplete={() => {
                            setUpdateModalVisible(false);
                            handleRefresh();
                            showAlert("Success", "Subscription plan update request sent."); // Adjusted message for pending change if applicable
                        }}
                    />
                    <SuspendSubscriptionModal
                        theme={theme}
                        isVisible={isSuspendModalVisible}
                        onClose={() => setSuspendModalVisible(false)}
                        subscription={activeSubscription}
                        onComplete={() => {
                            setSuspendModalVisible(false);
                            handleRefresh();
                            showAlert("Success", "Subscription has been suspended.");
                        }}
                    />
                     <CancelReasonModal 
                        theme={theme}
                        isVisible={isCancelReasonModalVisible}
                        onClose={() => setCancelReasonModalVisible(false)}
                        onSubmit={performCancellation} 
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    errorText: { color: theme.danger, fontSize: 16 },
    scrollContainer: { padding: 16 },

    card: {
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 5,
    },

    profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarImage: { width: '100%', height: '100%', borderRadius: 32 },
    avatarText: { color: theme.textSecondary, fontSize: 24, fontWeight: '600' },
    profileInfo: { flex: 1 },
    userName: { fontSize: 24, fontWeight: '700', color: theme.text },
    userInfo: { fontSize: 15, color: theme.textSecondary, marginTop: 4 },
    
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: 20,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    actionButtonText: {
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 8,
    },
    
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 20 },
    
    pendingDescription: {
        fontSize: 15,
        color: theme.textSecondary,
        lineHeight: 22,
        marginBottom: 20,
    },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 },
    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '50%',
        padding: 8,
        marginBottom: 12,
    },
    statCardIcon: { marginRight: 12 },
    statCardTitle: { fontSize: 14, color: theme.textSecondary, marginBottom: 2 },
    statCardValue: { fontSize: 12, fontWeight: 'bold' },
    
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    historyItemIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    historyItemDetails: { flex: 1 },
    historyItemTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
    historyItemDate: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    historyItemAmountContainer: { alignItems: 'flex-end', marginRight: 8 },
    historyItemAmount: { fontSize: 16, fontWeight: 'bold', color: theme.text },
    historyItemStatus: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },

    noHistoryContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 30,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        marginTop: 10,
    },
    noHistoryText: {
        marginTop: 12,
        color: theme.textSecondary,
        fontSize: 16,
    },
});