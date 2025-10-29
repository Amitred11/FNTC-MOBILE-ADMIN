import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import ActionModal from './ActionModal'; 
import api from '../../../services/api';

const SuspendSubscriptionModal = ({ theme, isVisible, onClose, subscription, onComplete }) => {
    const styles = getStyles(theme);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSuspend = async () => {
        if (!reason.trim()) return;
        setIsSubmitting(true);
        try {
            await api.post(`/admin/subscriptions/${subscription._id}/suspend`, { reason });
            onComplete();
        } catch (error) {
            console.error("Failed to suspend subscription", error);
        } finally {
            setIsSubmitting(false);
            setReason('');
        }
    };
    
    return (
        <ActionModal
            isVisible={isVisible}
            onClose={() => { onClose(); setReason(''); }}
            title="Suspend Subscription"
            primaryButtonText="Confirm Suspension"
            onPrimaryButtonPress={handleSuspend}
            isPrimaryDisabled={!reason.trim() || isSubmitting}
            theme={theme}
            buttonType="destructive"
        >
            <Text style={styles.promptText}>
                Please provide a reason for suspending the subscription for <Text style={{fontWeight: 'bold'}}>{subscription?.userId?.displayName}</Text>. The user will be notified.
            </Text>
            <TextInput
                style={styles.reasonInput}
                placeholder="e.g., Non-payment of dues"
                placeholderTextColor={theme.textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
            />
        </ActionModal>
    );
};

const getStyles = (theme) => StyleSheet.create({
    promptText: {
        fontSize: 16,
        color: theme.textSecondary,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 20,
    },
    reasonInput: {
        backgroundColor: theme.surface,
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: theme.text,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: theme.border,
    },
});

export default SuspendSubscriptionModal;