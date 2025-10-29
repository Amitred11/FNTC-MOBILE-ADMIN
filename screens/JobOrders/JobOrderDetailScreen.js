import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';

// --- Reusable Components ---

const InfoRow = ({ label, value, theme, icon, isAddress = false }) => {
    const styles = getStyles(theme);
    return (
        <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={icon} size={20} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={styles.infoRowLabel}>{label}</Text>
            </View>
            <Text style={[styles.infoRowValue, isAddress && styles.addressText]} numberOfLines={isAddress ? 3 : 1}>
                {value || 'N/A'}
            </Text>
        </View>
    );
};

// --- Main Component ---

export default function JobOrderDetailScreen({ route, navigation }) {
    const { jobId } = route.params;
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    const { user } = useAuth(); 

    const [job, setJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for the status update modal
    const [isModalVisible, setModalVisible] = useState(false);
    const [note, setNote] = useState('');
    const [targetStatus, setTargetStatus] = useState('');

    const fetchJobDetails = useCallback(async () => {
        if (!jobId) {
            showAlert("Error", "Job ID is missing.", [{ text: "OK", onPress: () => navigation.goBack() }]);
            return;
        }
        try {
            const { data } = await api.get(`/admin/job-orders/${jobId}`);
            setJob(data);
            navigation.setOptions({ title: `Job: ${data.type}` });
        } catch (error) {
            showAlert("Error", "Could not load job details.", [{ text: "OK", onPress: () => navigation.goBack() }]);
        } finally {
            setIsLoading(false);
            setIsSubmitting(false);
        }
    }, [jobId, navigation, showAlert]);

    useFocusEffect(useCallback(() => { 
        setIsLoading(true);
        fetchJobDetails(); 
    }, [fetchJobDetails]));

    // --- Action Handlers ---

    const handleAccept = async () => {
        setIsSubmitting(true);
        try {
            await api.put(`/admin/job-orders/${jobId}/accept`);
            showAlert("Success", "Job has been accepted.");
            await fetchJobDetails();
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to accept job.");
            setIsSubmitting(false);
        }
    };

    const handleDecline = async () => {
        showAlert("Confirm Decline", "Are you sure you want to decline this job? It will be returned to the queue.", [
            { text: "Cancel", style: "cancel" },
            { text: "Decline", style: "destructive", onPress: async () => {
                setIsSubmitting(true);
                try {
                    await api.put(`/admin/job-orders/${jobId}/decline`);
                    showAlert("Job Declined", "The job has been returned to the assignment queue.", [{ text: "OK", onPress: () => navigation.goBack() }]);
                } catch (error) {
                    showAlert("Error", error.response?.data?.message || "Failed to decline job.");
                    setIsSubmitting(false);
                }
            }}
        ]);
    };

    const handleStatusUpdate = async () => {
        if (!note.trim()) {
            return showAlert("Note Required", "Please provide a note for this status update.");
        }
        setIsSubmitting(true);
        try {
            const payload = { status: targetStatus, note: note };
            await api.put(`/admin/job-orders/${jobId}/status`, payload);
            showAlert("Success", `Job status has been updated to ${targetStatus}.`);
            setModalVisible(false);
            setNote('');
            await fetchJobDetails();
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to update status.");
            setIsSubmitting(false);
        }
    };
    
    const openStatusModal = (status) => {
        setTargetStatus(status);
        setModalVisible(true);
    };

    // --- Render Action Buttons based on Role and Status ---

    const renderActionButtons = () => {
        if (user?.role !== 'field_agent' || !job) return null;

        switch (job.status) {
            case 'Pending Acceptance':
                return (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.declineButton} onPress={handleDecline} disabled={isSubmitting}>
                            <Text style={styles.declineButtonText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>Accept Job</Text>}
                        </TouchableOpacity>
                    </View>
                );
            case 'Assigned':
                return (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.fullWidthButton} onPress={() => openStatusModal('In Progress')} disabled={isSubmitting}>
                           {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>Start Work</Text>}
                        </TouchableOpacity>
                    </View>
                );
            case 'In Progress':
                return (
                     <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => openStatusModal('On Hold')} disabled={isSubmitting}>
                            <Text style={styles.secondaryButtonText}>On Hold</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.acceptButton} onPress={() => openStatusModal('Completed')} disabled={isSubmitting}>
                           {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>Mark as Completed</Text>}
                        </TouchableOpacity>
                    </View>
                );
            default:
                return null;
        }
    };

    if (isLoading) {
        return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></SafeAreaView>;
    }

    if (!job) {
        return <SafeAreaView style={styles.centered}><Text style={styles.emptyText}>Job details could not be loaded.</Text></SafeAreaView>;
    }

    const getCustomerInfo = () => {
        if (job.userId) { 
            return {
                name: job.userId.displayName,
                contact: job.userId.profile?.mobileNumber,
                address: `${job.userId.profile?.address || ''}, ${job.userId.profile?.city || ''}, ${job.userId.profile?.province || ''}`.trim(),
            };
        }
        if (job.customerDetails) { 
            return {
                name: job.customerDetails.name,
                contact: job.customerDetails.contactNumber,
                address: job.customerDetails.address,
            };
        }
        return { name: 'Unknown', contact: 'N/A', address: 'N/A' };
    };
    
    const customer = getCustomerInfo();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Job Overview</Text>
                    <InfoRow label="Job ID" value={job.jobId || `JO-${job._id.slice(-6)}`} theme={theme} icon="barcode-outline" />
                    <InfoRow label="Status" value={job.status} theme={theme} icon="information-circle-outline" />
                    <InfoRow label="Type" value={job.type} theme={theme} icon="build-outline" />
                    <InfoRow label="Assigned To" value={job.assignedTo?.displayName || 'Unassigned'} theme={theme} icon="person-circle-outline" />
                    <InfoRow label="Created On" value={new Date(job.createdAt).toLocaleString()} theme={theme} icon="calendar-outline" />
                    {job.completionDate && <InfoRow label="Completed On" value={new Date(job.completionDate).toLocaleString()} theme={theme} icon="checkmark-done-outline" />}
                </View>

                <View style={styles.card}>
                    <Text style={styles.title}>Customer Information</Text>
                    <InfoRow label="Name" value={customer.name} theme={theme} icon="person-outline" />
                    <InfoRow label="Contact No." value={customer.contact} theme={theme} icon="call-outline" />
                    <InfoRow label="Address" value={customer.address} theme={theme} icon="location-outline" isAddress={true} />
                </View>

                <View style={styles.card}>
                    <Text style={styles.title}>Task Description</Text>
                    <Text style={styles.descriptionText}>{job.description}</Text>
                </View>

                 {job.notes?.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.title}>History & Notes</Text>
                        {job.notes.map((note, index) => (
                            <View key={index} style={styles.noteItem}>
                                <Text style={styles.noteText}>{note.text}</Text>
                                <Text style={styles.noteAuthor}>- {note.author || 'System'} on {new Date(note.timestamp || Date.now()).toLocaleDateString()}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
            
            {renderActionButtons()}

            <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Status to "{targetStatus}"</Text>
                        <Text style={styles.modalLabel}>Add a note (required)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g., 'Completed installation successfully.'"
                            multiline
                            value={note}
                            onChangeText={setNote}
                        />
                        <View style={styles.modalActions}>
                             <TouchableOpacity style={styles.modalCancelButton} onPress={() => setModalVisible(false)}>
                                <Text style={styles.secondaryButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmButton} onPress={handleStatusUpdate} disabled={isSubmitting}>
                                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>Confirm Update</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

// --- Styles ---

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, padding: 15 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    card: {
        backgroundColor: theme.surface, borderRadius: 15, padding: 20, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    },
    title: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10 },
    descriptionText: { fontSize: 16, color: theme.text, lineHeight: 24 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    infoRowLabel: { fontSize: 16, color: theme.textSecondary },
    infoRowValue: { fontSize: 12, color: theme.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
    emptyText: { color: theme.textSecondary, textAlign: 'center' },
    addressText: {
        textAlign: 'right',
        flexShrink: 1,
    },
    
    // Action Buttons
    actionsContainer: { flexDirection: 'row', padding: 15, gap: 10, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface },
    acceptButton: { flex: 2, backgroundColor: theme.primary, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    acceptButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    declineButton: { flex: 1, backgroundColor: theme.background, padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    declineButtonText: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
    fullWidthButton: { flex: 1, backgroundColor: theme.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
    secondaryButton: { flex: 1, backgroundColor: theme.surface, padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    secondaryButtonText: { color: theme.text, fontSize: 16, fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 10, textAlign: 'center' },
    modalLabel: { fontSize: 16, color: theme.textSecondary, marginBottom: 8, marginTop: 10 },
    modalInput: { backgroundColor: theme.background, color: theme.text, height: 100, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 10, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
    modalConfirmButton: { flex: 2, backgroundColor: theme.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
    modalCancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border },

    // Note Styles
    noteItem: { borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 10 },
    noteText: { fontSize: 15, color: theme.text },
    noteAuthor: { fontSize: 12, color: theme.textSecondary, textAlign: 'right', fontStyle: 'italic', marginTop: 4 },
});