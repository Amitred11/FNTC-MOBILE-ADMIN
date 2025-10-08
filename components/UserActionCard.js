import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const ActionRow = ({ theme, icon, color, title, subtitle, buttons = [] }) => {
    const styles = getStyles(theme);
    return (
        <View style={styles.actionRow}>
            <View style={[styles.actionIconContainer, { backgroundColor: `${color}20` }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>

            {/* This container holds the text and buttons in a vertical stack */}
            <View style={styles.actionBody}>
                <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>{title}</Text>
                    {subtitle && <Text style={styles.actionSubtitle}>{subtitle}</Text>}
                </View>

                {/* Buttons are rendered below the text */}
                {buttons.length > 0 && (
                    <View style={styles.actionButtonsGroup}>
                        {buttons.map((btn, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.actionButton,
                                    btn.secondary
                                        ? [styles.actionButtonSecondary, { borderColor: btn.color }]
                                        : { backgroundColor: btn.color }
                                ]}
                                onPress={btn.onPress}
                            >
                                <Text style={[styles.actionButtonText, btn.secondary && { color: btn.color }]}>
                                    {btn.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
};

export const UserActionCard = ({
    item,
    theme,
    onNavigateToUser,
    onNavigateToBill,
    onApproveVerification,
    onActivateSub,
    onApprovePlanChange,
    onDecline,
    onMarkAsDue,
}) => {
    const styles = getStyles(theme);
    const { user, actions } = item;

    const allActions = [
        ...(actions.stuckUpcomingBills || []).map(bill => ({
            id: bill._id,
            type: 'ACTION REQUIRED: Stuck Bill',
            icon: 'alert-circle',
            color: theme.danger,
            subtitle: `This bill was due on ${new Date(bill.dueDate).toLocaleDateString()} but was not processed.`,
            buttons: [
                { label: 'Mark as Due', color: theme.danger, onPress: () => onMarkAsDue(bill) },
            ]
        })),
        ...actions.pendingApplications.map(sub => ({
            id: sub._id,
            type: 'Pending Application',
            icon: 'person-add-outline',
            color: theme.primary,
            subtitle: `Plan: ${sub.planId?.name}`,
            buttons: [
                { label: 'Decline', color: theme.danger, onPress: () => onDecline(sub), secondary: true },
                { label: 'Approve', color: theme.success, onPress: () => onApproveVerification(sub) },
            ]
        })),
        ...actions.pendingInstallations.map(sub => ({
            id: sub._id,
            type: 'Pending Installation',
            icon: 'construct-outline',
            color: theme.accent,
            subtitle: sub.initialBill
                ? `${sub.planId?.name} - Bill: ₱${sub.initialBill.amount.toFixed(2)}`
                : `Plan: ${sub.planId?.name}`,
            buttons: [
                { label: 'Decline', color: theme.danger, onPress: () => onDecline(sub), secondary: true },
                ...(sub.initialBill ? [{ label: 'View Bill', color: theme.primary, onPress: () => onNavigateToBill(sub.initialBill._id), secondary: true }] : []),
                { label: 'Activate', color: theme.success, onPress: () => onActivateSub(sub) },
            ]
        })),
        ...actions.pendingPaymentVerifications.map(bill => ({
            id: bill._id,
            type: 'Verify Payment',
            icon: 'hourglass-outline',
            color: theme.warning,
            subtitle: `₱${bill.amount.toFixed(2)} - ${bill.planName}`,
            buttons: [{ label: 'Review', color: theme.primary, onPress: () => onNavigateToBill(bill._id) }]
        })),
        ...actions.pendingPlanChanges.map(sub => ({
            id: sub._id,
            type: 'Plan Change Request',
            icon: 'swap-horizontal',
            color: '#7C3AED',
            subtitle: `${sub.planId?.name} → ${sub.pendingPlanId?.name}`,
            buttons: [
                { label: 'Decline', color: theme.danger, onPress: () => onDecline(sub), secondary: true },
                { label: 'Schedule', color: theme.primary, onPress: () => onApprovePlanChange(sub, true), secondary: true },
                { label: 'Approve', color: theme.success, onPress: () => onApprovePlanChange(sub, false) },
            ]
        })),
        ...(actions.unpaidBills.length > 0 ? [{
            id: 'unpaid-bills',
            type: `${actions.unpaidBills.length} Unpaid Bill(s)`,
            icon: 'wallet-outline',
            color: theme.danger,
            subtitle: `Total Due: ₱${actions.unpaidBills.reduce((sum, bill) => sum + bill.amount, 0).toFixed(2)}`,
            buttons: [{ label: 'View All', color: theme.primary, onPress: () => onNavigateToUser(user._id) }]
        }] : [])
    ];

    const totalActions = allActions.length;

    return (
        <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
            <TouchableOpacity style={styles.cardHeader} onPress={() => onNavigateToUser(user._id)} activeOpacity={0.7}>
                <Image source={user.photoUrl ? { uri: user.photoUrl } : require('../assets/images/default-avatar.jpg')} style={styles.userAvatar} />
                <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>{user.displayName || 'Unknown User'}</Text>
                    <Text style={styles.cardSubtitle}>{totalActions} pending action{totalActions !== 1 && 's'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={styles.actionsContainer}>
                {allActions.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {index > 0 && <View style={styles.separator} />}
                        <ActionRow
                            theme={theme}
                            icon={item.icon}
                            color={item.color}
                            title={item.type}
                            subtitle={item.subtitle}
                            buttons={item.buttons}
                        />
                    </React.Fragment>
                ))}
            </View>
        </Animatable.View>
    );
};

const getStyles = (theme) => StyleSheet.create({
    card: {
        backgroundColor: theme.surface,
        borderRadius: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: theme.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    userAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
    cardHeaderText: { flex: 1 },
    cardTitle: { fontSize: 17, fontWeight: 'bold', color: theme.text },
    cardSubtitle: { fontSize: 14, color: theme.textSecondary, paddingTop: 2 },

    actionsContainer: {
        // Container for all the action rows
    },

    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 15,
        paddingVertical: 14,
    },
    separator: {
        height: 1,
        backgroundColor: theme.border,
        marginLeft: 15,
    },

    actionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2, // Align icon with the title text
    },

    // SOLUTION: This body is now a vertical container
    actionBody: {
        flex: 1,
        flexDirection: 'column', // Stack children vertically
    },

    actionTextContainer: {
        justifyContent: 'center',
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.text,
    },
    actionSubtitle: {
        fontSize: 13,
        color: theme.textSecondary,
        paddingTop: 3,
    },

    // Button group now has a top margin to create space
    actionButtonsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap', // Allow buttons to wrap to next line if needed
        gap: 8,
        marginTop: 12, // Space between subtitle and buttons
    },
    actionButton: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    actionButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
});