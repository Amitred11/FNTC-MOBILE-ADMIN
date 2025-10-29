// screens/Subscription/components/CancelReasonModal.js
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CancelReasonModal = ({ isVisible, onClose, onSubmit, theme }) => {
    const [reason, setReason] = useState('');
    const styles = getStyles(theme);

    const handleSubmit = () => {
        onSubmit(reason);
        setReason('');
    };

    const handleClose = () => {
        setReason('');
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingContainer}
            >
                <SafeAreaView style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                            <Ionicons name="close-circle-outline" size={28} color={theme.textSecondary} />
                        </TouchableOpacity>

                        <Text style={styles.modalTitle}>Provide Cancellation Reason</Text>
                        <Text style={styles.modalDescription}>
                            Please provide a detailed reason for cancelling this subscription. This action cannot be undone.
                        </Text>

                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g., Customer requested termination due to relocation."
                            placeholderTextColor={theme.textSecondary}
                            multiline={true}
                            numberOfLines={4}
                            value={reason}
                            onChangeText={setReason}
                            textAlignVertical="top"
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.cancelButton, { borderColor: theme.textSecondary }]}
                                onPress={handleClose}
                            >
                                <Text style={[styles.actionButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.submitButton, { backgroundColor: theme.danger }]}
                                onPress={handleSubmit}
                            >
                                <Text style={[styles.actionButtonText, { color: '#fff' }]}>Submit Cancellation</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const getStyles = (theme) => StyleSheet.create({
    keyboardAvoidingContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: theme.surface,
        borderRadius: 20,
        padding: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 8,
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 1,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: 14,
        color: theme.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    textInput: {
        backgroundColor: theme.background,
        borderRadius: 12,
        padding: 15,
        fontSize: 15,
        color: theme.text,
        minHeight: 100,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 25,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    submitButton: {
        // Background color is set directly in the component for destructive type
        // borderColor is not needed as it's a solid button
        borderWidth: 0,
    },
});

export default CancelReasonModal;