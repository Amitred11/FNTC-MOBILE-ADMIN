// screens/JobOrderDetailScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, FlatList, SafeAreaView, TextInput } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../contexts/AlertContext';

const InfoRow = ({ label, value, theme, icon }) => {
    const styles = getStyles(theme);
    return (
        <View style={styles.infoRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={icon} size={20} color={theme.primary} style={{ marginRight: 10 }} />
                <Text style={styles.infoRowLabel}>{label}</Text>
            </View>
            <Text style={styles.infoRowValue} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
        </View>
    );
};

export default function JobOrderDetailScreen({ route, navigation }) {
    const jobId = route.params?.jobId;
    const { theme } = useTheme();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const styles = getStyles(theme);
    const [job, setJob] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAssignModalVisible, setAssignModalVisible] = useState(false);
    const [agentList, setAgentList] = useState([]);
    const [isAgentsLoading, setIsAgentsLoading] = useState(false);
    const [isArchiveModalVisible, setArchiveModalVisible] = useState(false);
    const [archiveNote, setArchiveNote] = useState('');

    useEffect(() => {
        if (!jobId) {
            showAlert(
                "Error",
                "Job ID is missing. Returning to the previous screen.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        }
    }, [jobId, navigation]);

    const fetchJobDetails = useCallback(async () => {
        if (!jobId) return;
        try {
            const { data } = await api.get(`/admin/job-orders/${jobId}`);
            setJob(data);
            navigation.setOptions({ title: `Job: ${data.type}` });
        } catch (error) {
            console.error("Failed to fetch job details:", error);
            showAlert("Error", "Could not load job details.", [{ text: "OK", onPress: () => navigation.goBack() }]);
        }
    }, [jobId, navigation]);

    useFocusEffect(
        useCallback(() => {
            if (jobId) {
                setIsLoading(true);
                fetchJobDetails().finally(() => setIsLoading(false));
            } else {
                setIsLoading(false);
            }
        }, [jobId, fetchJobDetails])
    );

    const openAssignModal = async () => {
        setAssignModalVisible(true);
        setIsAgentsLoading(true);
        try {
            const { data: agents } = await api.get('/admin/field-agents');
            setAgentList(agents);
        } catch (error) {
            showAlert("Error", "Could not fetch list of field agents.");
            setAssignModalVisible(false);
        } finally {
            setIsAgentsLoading(false);
        }
    };

    const handleManualAssign = async (agentId) => {
        setAssignModalVisible(false);
        setIsUpdating(true);
        try {
            const { data } = await api.put(`/admin/job-orders/${jobId}/assign`, { agentId });
            await fetchJobDetails();
            showAlert("Success", data.message);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to assign job.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdateStatus = async (status) => {
        setIsUpdating(true);
        try {
            await api.put(`/admin/job-orders/${jobId}/status`, { status });
            await fetchJobDetails();
            showAlert("Success", `Job status updated to '${status}'.`);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to update job status.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAcceptJob = async () => {
        setIsUpdating(true);
        try {
            await api.put(`/admin/job-orders/${jobId}/accept`);
            await fetchJobDetails();
            showAlert("Success", "Job has been accepted!");
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to accept job.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeclineJob = async () => {
        setIsUpdating(true);
        try {
            await api.put(`/admin/job-orders/${jobId}/decline`);
            showAlert("Success", "Job declined and returned to queue.", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to decline job.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAutoAssign = async () => {
        setIsUpdating(true);
        try {
            const { data } = await api.put(`/admin/job-orders/${jobId}/auto-assign`);
            await fetchJobDetails();
            showAlert("Success", data.message);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to auto-assign job.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCompleteJob = async () => {
        showAlert(
            "Confirm Completion",
            "This will mark the job as complete. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm Complete", style: "destructive", onPress: () => handleUpdateStatus('Completed') }
            ]
        );
    };

    const handleArchiveJob = async () => {
        if (!archiveNote.trim()) {
            showAlert("Note Required", "Please provide a reason or note for archiving.");
            return;
        }
        setIsUpdating(true);
        setArchiveModalVisible(false);
        try {
            const { data } = await api.post(`/admin/job-orders/${jobId}/archive`, { note: archiveNote });
            showAlert("Success", data.message, [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to archive job.");
        } finally {
            setIsUpdating(false);
            setArchiveNote('');
        }
    };

    if (!jobId || isLoading) {
        return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></SafeAreaView>;
    }
    if (!job) {
        return <SafeAreaView style={styles.centered}><Text style={styles.emptyText}>Job details not found.</Text></SafeAreaView>;
    }

    const isAgent = user.role === 'field_agent';
    const isAdmin = user.role === 'admin';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <ScrollView style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>Job Details</Text>
                    <InfoRow label="Status" value={job.status} theme={theme} icon="information-circle-outline" />
                    <InfoRow label="Type" value={job.type} theme={theme} icon="build-outline" />
                    <InfoRow label="Customer"   value={job?.userId?.displayName || 'Unknown User'} theme={theme} icon="person-outline" />
                    <InfoRow label="Assigned To" value={job.assignedTo?.displayName || 'Unassigned'} theme={theme} icon="person-circle-outline" />
                    <InfoRow label="Created On" value={new Date(job.createdAt).toLocaleString()} theme={theme} icon="calendar-outline" />
                    {job.completionDate && <InfoRow label="Completed On" value={new Date(job.completionDate).toLocaleString()} theme={theme} icon="checkmark-done-outline" />}
                </View>

                <View style={styles.card}>
                    <Text style={styles.title}>Description</Text>
                    <Text style={styles.descriptionText}>{job.description}</Text>
                </View>

                <View style={styles.actionsContainer}>
                    {isAgent && job.status === 'Pending Acceptance' && (
                        <View style={styles.buttonGroup}>
                            <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={handleDeclineJob} disabled={isUpdating}>
                                <Ionicons name="close-circle-outline" size={22} color={theme.danger} />
                                <Text style={[styles.buttonText, { color: theme.danger }]}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, { backgroundColor: theme.success }]} onPress={handleAcceptJob} disabled={isUpdating}>
                                <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                                <Text style={styles.buttonText}>Accept Job</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {isAgent && job.status === 'Assigned' && (
                        <TouchableOpacity style={[styles.button, { backgroundColor: theme.accent }]} onPress={() => handleUpdateStatus('In Progress')} disabled={isUpdating}>
                            <Ionicons name="play-circle-outline" size={22} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Start Job</Text>
                        </TouchableOpacity>
                    )}
                    {isAgent && job.status === 'In Progress' && (
                        <TouchableOpacity style={[styles.button, { backgroundColor: theme.success }]} onPress={handleCompleteJob} disabled={isUpdating}>
                            <Ionicons name="flag-outline" size={22} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Mark as Completed</Text>
                        </TouchableOpacity>
                    )}

                    {isAdmin && job.status === 'Pending Assignment' && (
                        <View style={styles.buttonGroup}>
                            <TouchableOpacity style={[styles.button, styles.manualAssignButton]} onPress={openAssignModal} disabled={isUpdating}>
                                <Ionicons name="person-add-outline" size={22} color={theme.primary} />
                                <Text style={[styles.buttonText, { color: theme.primary }]}>Manual</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleAutoAssign} disabled={isUpdating}>
                                <Ionicons name="sparkles-outline" size={22} color="#FFFFFF" />
                                <Text style={styles.buttonText}>Auto-Assign</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isAdmin && job.status === 'Completed' && (
                        <TouchableOpacity style={[styles.button, { backgroundColor: theme.textSecondary, marginTop: 10 }]} onPress={() => setArchiveModalVisible(true)} disabled={isUpdating}>
                            <Ionicons name="archive-outline" size={22} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Archive Job</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            <Modal animationType="fade" transparent={true} visible={isAssignModalVisible} onRequestClose={() => setAssignModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Assign to Field Agent</Text>
                        {isAgentsLoading ? (
                            <ActivityIndicator size="large" color={theme.primary} />
                        ) : (
                            <FlatList
                                data={agentList}
                                keyExtractor={(item) => item._id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.agentItem} onPress={() => handleManualAssign(item._id)}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons name="person-circle-outline" size={40} color={theme.primary} style={{ marginRight: 15 }} />
                                            <View>
                                                <Text style={styles.agentName}>{item.displayName}</Text>
                                                <Text style={styles.agentWorkload}>{item.workload} active job{item.workload !== 1 && 's'}</Text>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={<Text style={styles.emptyText}>No available field agents found.</Text>}
                            />
                        )}
                        <TouchableOpacity style={styles.modalCancelButton} onPress={() => setAssignModalVisible(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal animationType="fade" transparent={true} visible={isArchiveModalVisible} onRequestClose={() => setArchiveModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Archive Job Order</Text>
                        <Text style={styles.modalSubtext}>This action is permanent. Please add a concluding note before archiving.</Text>
                        <TextInput
                            style={styles.archiveNoteInput}
                            placeholder="e.g., Archived after annual review."
                            placeholderTextColor={theme.textSecondary}
                            value={archiveNote}
                            onChangeText={setArchiveNote}
                            multiline
                        />
                        <TouchableOpacity style={styles.modalConfirmButton} onPress={handleArchiveJob} disabled={isUpdating}>
                            <Text style={styles.modalButtonText}>Confirm & Archive</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalCancelButton} onPress={() => setArchiveModalVisible(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background, padding: 15 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    card: {
        backgroundColor: theme.surface, borderRadius: 15, padding: 20, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    },
    title: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 10 },
    descriptionText: { fontSize: 16, color: theme.text, lineHeight: 24 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    infoRowLabel: { fontSize: 16, color: theme.textSecondary },
    infoRowValue: { fontSize: 16, color: theme.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
    emptyText: { color: theme.textSecondary, textAlign: 'center' },
    actionsContainer: { marginTop: 10, paddingHorizontal: 5, paddingBottom: 20 },
    buttonGroup: { flexDirection: 'row', gap: 10 },
    button: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 15,
    },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    declineButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.danger },
    manualAssignButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: theme.primary },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: {
        backgroundColor: theme.surface, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20,
        maxHeight: '80%',
    },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 15, textAlign: 'center' },
    modalSubtext: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    modalConfirmButton: {
        backgroundColor: theme.primary,
        padding: 20, // A larger padding for a primary action button
        borderRadius: 15,
        alignItems: 'center', // This is crucial for centering the text
        marginTop: 20,
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    archiveNoteInput: {
        backgroundColor: theme.background, color: theme.text, padding: 15, borderRadius: 10,
        borderWidth: 1, borderColor: theme.border, fontSize: 16, minHeight: 100, textAlignVertical: 'top'
    },
    agentItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18,
        borderBottomWidth: 1, borderBottomColor: theme.border,
    },
    agentName: { fontSize: 18, color: theme.text, fontWeight: '600' },
    agentWorkload: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    modalCancelButton: { marginTop: 15, padding: 18, borderRadius: 15, backgroundColor: theme.background, alignItems: 'center' },
    modalCancelText: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
});