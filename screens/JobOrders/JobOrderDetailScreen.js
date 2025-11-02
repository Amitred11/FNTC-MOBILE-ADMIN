// screens/JobOrderDetailScreen.js
import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView,
    TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform,
    Image, FlatList, Dimensions
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

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

    // Modal states
    const [isCompletedModalVisible, setCompletedModalVisible] = useState(false);
    const [isOnHoldModalVisible, setOnHoldModalVisible] = useState(false);
    const [modalNote, setModalNote] = useState(''); // Renamed to avoid conflict with job notes
    const [modalPhotoEvidences, setModalPhotoEvidences] = useState([]); // For modal photos

    // State for the full-screen image viewer
    const [isImageViewerVisible, setImageViewerVisible] = useState(false);
    const [imageViewerData, setImageViewerData] = useState({ images: [], startIndex: 0 });

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

    const handleDecline = () => {
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

    const handleDirectStatusUpdate = async (newStatus) => {
        setIsSubmitting(true);
        try {
            await api.put(`/admin/job-orders/${jobId}/status`, { status: newStatus });
            showAlert("Success", `Job status has been updated to ${newStatus}.`);
            await fetchJobDetails();
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to update status.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOnHoldStatusUpdate = async () => {
        // Only submit if there's a reason OR evidence
        if (!modalNote.trim() && modalPhotoEvidences.length === 0) {
            return showAlert("Note or Evidence Required", "Please provide a reason or upload photo evidence for putting this job on hold.");
        }
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('status', 'On Hold');
        if (modalNote.trim()) {
            formData.append('note', modalNote);
        }

        modalPhotoEvidences.forEach((photoUri) => {
            const uriParts = photoUri.split('/');
            const fileName = uriParts[uriParts.length - 1];
            formData.append('evidences', {
                uri: photoUri,
                name: fileName,
                type: `image/jpeg`, // Consider deriving from file extension if possible
            });
        });

        try {
            await api.put(`/admin/job-orders/${jobId}/status`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            showAlert("Success", "Job status has been updated to On Hold.");
            setOnHoldModalVisible(false);
            resetModalState('hold'); // Reset modal state
            await fetchJobDetails();
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to update status.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCompletedStatusUpdate = async () => {
        if (modalPhotoEvidences.length === 0) {
            return showAlert("Evidence Required", "Please provide at least one photo as evidence to complete the job.");
        }
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('status', 'Completed');
        if (modalNote.trim()) {
            formData.append('note', modalNote);
        }

        modalPhotoEvidences.forEach((photoUri) => {
            const uriParts = photoUri.split('/');
            const fileName = uriParts[uriParts.length - 1];
            formData.append('evidences', {
                uri: photoUri,
                name: fileName,
                type: `image/jpeg`, // Or derive from file extension
            });
        });

        try {
            await api.put(`/admin/job-orders/${jobId}/status`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            showAlert("Success", `Job status has been updated to Completed.`);
            setCompletedModalVisible(false);
            resetModalState('completed'); // Reset modal state
            await fetchJobDetails();
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to update status.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to reset modal states
    const resetModalState = (modalType) => {
        if (modalType === 'completed') {
            setModalNote('');
            setModalPhotoEvidences([]);
        } else if (modalType === 'hold') {
            setModalNote('');
            setModalPhotoEvidences([]);
        }
    };

    const openCompletedModal = () => {
        resetModalState('completed');
        setCompletedModalVisible(true);
    };

    const openOnHoldModal = () => {
        resetModalState('hold');
        setOnHoldModalVisible(true);
    };

    const handlePickImage = async (isModalUpdate = false) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert('Permission Denied', 'Sorry, we need camera roll permissions to make this work.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            if (isModalUpdate) {
                setModalPhotoEvidences(prev => [...prev, result.assets[0].uri]);
            } else {
                // This branch might be for a different use case if needed, currently only modal photos are used
                // setPhotoEvidences([...photoEvidences, result.assets[0].uri]);
            }
        }
    };

    const removePhoto = (uri, isModalUpdate = false) => {
        if (isModalUpdate) {
            setModalPhotoEvidences(modalPhotoEvidences.filter(photo => photo !== uri));
        } else {
            // Handle removal for other photo lists if they exist
        }
    };

    const openImageViewer = (clickedEvidence) => {
        const allEvidences = job.notes.flatMap(note => note.evidences || []);
        const imageUrls = allEvidences.map(e => e.url);
        const startIndex = imageUrls.findIndex(url => url === clickedEvidence.url);

        setImageViewerData({
            images: imageUrls,
            startIndex: startIndex >= 0 ? startIndex : 0,
        });
        setImageViewerVisible(true);
    };

    // --- Render Logic ---

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
                        <TouchableOpacity style={styles.fullWidthButton} onPress={() => handleDirectStatusUpdate('In Progress')} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>Start Work</Text>}
                        </TouchableOpacity>
                    </View>
                );
            case 'In Progress':
                return (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.secondaryButton} onPress={openOnHoldModal} disabled={isSubmitting}>
                            <Text style={styles.secondaryButtonText}>On Hold</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.acceptButton} onPress={openCompletedModal} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>Mark as Completed</Text>}
                        </TouchableOpacity>
                    </View>
                );
            case 'On Hold':
                return (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.fullWidthButton} onPress={() => handleDirectStatusUpdate('In Progress')} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>Resume Work</Text>}
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

    const customer = job.userId ? {
        name: job.userId.displayName,
        contact: job.userId.profile?.mobileNumber,
        address: [job.userId.profile?.address, job.userId.profile?.city, job.userId.profile?.province].filter(Boolean).join(', '),
    } : job.customerDetails ? {
        name: job.customerDetails.name,
        contact: job.customerDetails.contactNumber,
        address: job.customerDetails.address,
    } : { name: 'Unknown', contact: 'N/A', address: 'N/A' };

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
                        <Text style={styles.title}>Activity Log</Text>
                        {job.notes.map((note, index) => (
                            <View key={index} style={styles.noteItem}>
                                <Text style={styles.noteText}>{note.text}</Text>
                                {note.evidences && note.evidences.length > 0 && (
                                    <View style={styles.evidenceContainer}>
                                        {note.evidences.map((evidence, eIndex) => (
                                            <TouchableOpacity key={eIndex} onPress={() => openImageViewer(evidence)}>
                                                <Image source={{ uri: evidence.url }} style={styles.evidenceThumbnail} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                <Text style={styles.noteAuthor}>- {note.author?.displayName || 'System'} on {new Date(note.timestamp || Date.now()).toLocaleDateString()}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {renderActionButtons()}

            {/* --- 'Mark as Completed' Modal --- */}
            <Modal animationType="fade" transparent={true} visible={isCompletedModalVisible} onRequestClose={() => setCompletedModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Complete Job</Text>
                        <Text style={styles.modalLabel}>Photo Evidence (Required)</Text>
                        <FlatList
                            horizontal
                            data={modalPhotoEvidences}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <View style={styles.thumbnailContainer}>
                                    <Image source={{ uri: item }} style={styles.thumbnail} />
                                    <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(item, true)}>
                                        <Ionicons name="close-circle" size={24} color={theme.error} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListFooterComponent={
                                modalPhotoEvidences.length < 5 && ( // Limit to 5 photos
                                    <TouchableOpacity style={styles.addPhotoButton} onPress={() => handlePickImage(true)}>
                                        <Ionicons name="camera" size={24} color={theme.primary} />
                                        <Text style={styles.addPhotoButtonText}>Add Photo</Text>
                                    </TouchableOpacity>
                                )
                            }
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 15 }}
                        />
                        <Text style={styles.modalLabel}>Add a note (Optional)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g., 'Customer's pipe has been replaced.'"
                            multiline
                            value={modalNote}
                            onChangeText={setModalNote}
                        />
                        <View style={styles.modalActions}>
                             <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setCompletedModalVisible(false); resetModalState('completed'); }}>
                                <Text style={styles.secondaryButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmButton} onPress={handleCompletedStatusUpdate} disabled={isSubmitting || modalPhotoEvidences.length === 0}>
                                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>Confirm Completion</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- 'On Hold' Modal --- */}
            <Modal animationType="fade" transparent={true} visible={isOnHoldModalVisible} onRequestClose={() => setOnHoldModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Put Job On Hold</Text>
                        <Text style={styles.modalLabel}>Reason (Optional)</Text>
                        <TextInput
                            style={[styles.modalInput, { height: 80 }]} // Shorter input for reason
                            placeholder="e.g., 'Waiting for specific parts to arrive.'"
                            multiline
                            value={modalNote}
                            onChangeText={setModalNote}
                        />

                        <Text style={styles.modalLabel}>Add Photo Evidence (Optional)</Text>
                        <FlatList
                            horizontal
                            data={modalPhotoEvidences}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <View style={styles.thumbnailContainer}>
                                    <Image source={{ uri: item }} style={styles.thumbnail} />
                                    <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(item, true)}>
                                        <Ionicons name="close-circle" size={24} color={theme.error} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListFooterComponent={
                                modalPhotoEvidences.length < 3 && ( // Limit to 3 photos for 'On Hold'
                                    <TouchableOpacity style={styles.addPhotoButton} onPress={() => handlePickImage(true)}>
                                        <Ionicons name="camera" size={24} color={theme.primary} />
                                        <Text style={styles.addPhotoButtonText}>Add Photo</Text>
                                    </TouchableOpacity>
                                )
                            }
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 15 }}
                        />

                        <View style={styles.modalActions}>
                             <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setOnHoldModalVisible(false); resetModalState('hold'); }}>
                                <Text style={styles.secondaryButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmButton} onPress={handleOnHoldStatusUpdate} disabled={isSubmitting}>
                                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptButtonText}>Confirm</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* --- Full-Screen Image Viewer Modal --- */}
            <Modal
                visible={isImageViewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setImageViewerVisible(false)}
            >
                <View style={styles.imageViewerOverlay}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setImageViewerVisible(false)}>
                        <Ionicons name="close" size={32} color="#FFFFFF" />
                    </TouchableOpacity>
                    <FlatList
                        data={imageViewerData.images}
                        keyExtractor={(item, index) => `${item}-${index}`}
                        horizontal
                        pagingEnabled
                        initialScrollIndex={imageViewerData.startIndex}
                        getItemLayout={(data, index) => ({
                            length: width,
                            offset: width * index,
                            index,
                        })}
                        renderItem={({ item }) => (
                            <View style={styles.fullScreenImageContainer}>
                                <Image source={{ uri: item }} style={styles.fullScreenImage} resizeMode="contain" />
                            </View>
                        )}
                    />
                </View>
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
    infoRowValue: { fontSize: 16, color: theme.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
    emptyText: { color: theme.textSecondary, textAlign: 'center' },
    addressText: { textAlign: 'right', flexShrink: 1 },

    // Action Buttons
    actionsContainer: { flexDirection: 'row', padding: 15, gap: 10, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface },
    acceptButton: { flex: 2, backgroundColor: theme.primary, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    acceptButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    declineButton: { flex: 1, backgroundColor: theme.background, padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    declineButtonText: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
    fullWidthButton: { flex: 1, backgroundColor: theme.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
    secondaryButton: { flex: 1, backgroundColor: theme.surface, padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    secondaryButtonText: { color: theme.text, fontSize: 16, fontWeight: 'bold' },

    // Status Update Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 20, textAlign: 'center' },
    modalLabel: { fontSize: 16, color: theme.textSecondary, marginBottom: 8, marginTop: 10 },
    modalInput: { backgroundColor: theme.background, color: theme.text, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 10, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
    modalConfirmButton: { flex: 2, backgroundColor: theme.primary, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    modalCancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border },

    // Photo Evidence (Modal Input) Styles
    addPhotoButton: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    addPhotoButtonText: { color: theme.primary, fontSize: 12, marginTop: 4 },
    thumbnailContainer: { marginRight: 10, position: 'relative' },
    thumbnail: { width: 80, height: 80, borderRadius: 10 },
    removeButton: { position: 'absolute', top: -5, right: -5, backgroundColor: theme.surface, borderRadius: 12 },

    // Activity Log & Evidence Styles
    noteItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
    noteText: { fontSize: 15, color: theme.text, lineHeight: 22 },
    noteAuthor: { fontSize: 12, color: theme.textSecondary, textAlign: 'right', fontStyle: 'italic', marginTop: 8 },
    evidenceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    evidenceThumbnail: { width: 70, height: 70, borderRadius: 8, backgroundColor: theme.border },

    // Image Viewer Modal Styles
    imageViewerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.9)' },
    closeButton: { position: 'absolute', top: 50, right: 20, zIndex: 1, padding: 10 },
    fullScreenImageContainer: { width: width, height: '100%', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '100%', height: '80%' },
});