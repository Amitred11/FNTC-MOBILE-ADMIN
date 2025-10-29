import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, Modal, Image } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { SegmentedButtons } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';

// --- Simplified MessageBubble Component ---
const MessageBubble = ({ item, theme }) => {
    const styles = getStyles(theme);
    const isMyMessage = item.isAdmin === true;
    return (
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
            <Text style={isMyMessage ? styles.myMessageText : styles.theirMessageText}>{item.text}</Text>
            <Text style={[styles.timestamp, isMyMessage ? styles.myTimestamp : styles.theirTimestamp]}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
        </View>
    );
};

export default function TicketDetailScreen({ route, navigation }) {
    const { ticketId } = route.params;
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    const { user: adminUser } = useAuth();

    const [ticket, setTicket] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [editedText, setEditedText] = useState('');

    const [isImageModalVisible, setIsImageModalVisible] = useState(false);
    const [viewingImageUrl, setViewingImageUrl] = useState(null);

    const fetchTicket = useCallback(async (showLoader = false) => {
        if (showLoader) setIsLoading(true);
        try {
            const { data } = await api.get(`/admin/tickets/${ticketId}`);
            setTicket({ ...data, messages: data.messages || [] });
        } catch (error) {
            showAlert("Error", "Could not fetch ticket details.", [{ text: "OK", onPress: () => navigation.goBack() }]);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    }, [ticketId, navigation, showAlert]);

    useEffect(() => { fetchTicket(true); }, [ticketId]);
    useLayoutEffect(() => { navigation.setOptions({ title: `Ticket #${ticket?.ticketNumber || ticketId.slice(-6)}` }); }, [navigation, ticket]);

    const adminReply = useMemo(() => ticket?.messages.find(m => m.isAdmin), [ticket]);

    const handleSendReply = async () => {
        if (!replyText.trim() || isSending) return;
        setIsSending(true);
        try {
            await api.post(`/admin/tickets/${ticketId}/reply`, { text: replyText });
            setReplyText('');
            await fetchTicket(false);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to send reply.");
        } finally {
            setIsSending(false);
        }
    };
    
    const handleEditReply = async () => {
        if (!editedText.trim() || !editingMessage || isSending) return;
        setIsSending(true);
        try {
            await api.put(`/admin/tickets/${ticketId}/reply/${editingMessage._id}`, { text: editedText });
            setIsEditModalVisible(false);
            setEditingMessage(null);
            await fetchTicket(false);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to update reply.");
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteReply = (message) => {
        showAlert("Delete Reply", "Are you sure you want to delete this reply? This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                setIsSending(true);
                try {
                    await api.delete(`/admin/tickets/${ticketId}/reply/${message._id}`);
                    await fetchTicket(false);
                } catch (error) {
                    showAlert("Error", "Failed to delete reply.");
                } finally {
                    setIsSending(false);
                }
            }}
        ]);
    };
    
    const openEditModal = (message) => {
        setEditingMessage(message);
        setEditedText(message.text);
        setIsEditModalVisible(true);
    };

    const openImageModal = (url) => {
        setViewingImageUrl(url);
        setIsImageModalVisible(true);
    };

    const handleStatusChange = (newStatus) => {
        if (newStatus === ticket.status) return;
        showAlert("Confirm Status Change", `Are you sure you want to change the status to "${newStatus}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: async () => {
                const originalStatus = ticket.status;
                setTicket(prev => ({ ...prev, status: newStatus }));
                try {
                    await api.post(`/admin/tickets/${ticketId}/status`, { status: newStatus });
                } catch (error) {
                    setTicket(prev => ({ ...prev, status: originalStatus }));
                    showAlert("Error", "Failed to update status.");
                }
            }},
        ]);
    };

    const renderHeader = () => ticket && (
        <View style={styles.ticketHeader}>
            <Text style={styles.ticketSubject}>{`#${ticket.ticketNumber}: ${ticket.subject}`}</Text>
            <Text style={styles.ticketDescription}>{ticket.description}</Text>
            {ticket.imageUrl && (
                <>
                    <View style={styles.separator} />
                    <Text style={styles.attachmentTitle}>Attached Evidence</Text>
                    <TouchableOpacity onPress={() => openImageModal(ticket.imageUrl)}>
                        <Image source={{ uri: ticket.imageUrl }} style={styles.attachmentImage} resizeMode="cover" />
                    </TouchableOpacity>
                </>
            )}
        </View>
    );

    const renderMessageItem = ({ item }) => {
        const isMyMessage = item.isAdmin === true;
        const canModify = isMyMessage && item.senderId === adminUser._id;

        return (
            <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}>
                {canModify && (
                    <View style={styles.sideActionsContainer}>
                        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.sideActionButton}>
                            <Ionicons name="pencil" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteReply(item)} style={styles.sideActionButton}>
                            <Ionicons name="trash" size={20} color={theme.danger} />
                        </TouchableOpacity>
                    </View>
                )}
                <MessageBubble item={item} theme={theme} />
            </View>
        );
    };

    if (isLoading) return <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>;
    if (!ticket) return <View style={styles.centered}><Text style={styles.emptyText}>Ticket not found.</Text></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.statusSelectorContainer}>
                <SegmentedButtons value={ticket.status} onValueChange={handleStatusChange} density='medium' buttons={[
                    { value: 'Open', label: 'Open', style: styles.segmentButton },
                    { value: 'In Progress', label: 'In Progress', style: styles.segmentButton },
                    { value: 'Resolved', label: 'Resolved', style: styles.segmentButton },
                    { value: 'Closed', label: 'Closed', style: styles.segmentButton, disabled: ticket.status === 'Closed' },
                ]}/>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={120}>
                <FlatList
                    data={ticket.messages}
                    renderItem={renderMessageItem}
                    keyExtractor={(item) => item._id.toString()}
                    style={styles.messageList}
                    inverted
                    ListFooterComponent={renderHeader}
                />
                {!adminReply && ticket.status !== 'Closed' && (
                    <>
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
                            <Text style={styles.infoText}>You can only reply once to a ticket.</Text>
                        </View>
                        <View style={styles.inputContainer}>
                            <TextInput style={styles.textInput} value={replyText} onChangeText={setReplyText} placeholder="Type your reply..." placeholderTextColor={theme.textSecondary} multiline/>
                            <TouchableOpacity onPress={handleSendReply} style={[styles.sendButton, (isSending || !replyText.trim()) && styles.disabledButton]} disabled={isSending || !replyText.trim()}>
                                {isSending ? <ActivityIndicator color={"#FFF"} size="small" /> : <Ionicons name="arrow-up" size={24} color={"#FFF"} />}
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </KeyboardAvoidingView>

            <Modal visible={isEditModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsEditModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Reply</Text>
                        <TextInput style={styles.modalInput} value={editedText} onChangeText={setEditedText} multiline autoFocus/>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.modalButton} onPress={() => setIsEditModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={handleEditReply} disabled={isSending}>
                               {isSending ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: 'white' }}>Save Changes</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        <Modal visible={isImageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsImageModalVisible(false)}>
                <SafeAreaView style={styles.imageModalOverlay}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setIsImageModalVisible(false)}>
                        <Ionicons name="close" size={32} color="#FFF" />
                    </TouchableOpacity>
                    <Image source={{ uri: viewingImageUrl }} style={styles.fullScreenImage} resizeMode="contain" />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: theme.textSecondary, fontStyle: 'italic' },
    statusSelectorContainer: { padding: 10, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
    segmentButton: { borderColor: theme.border },
    ticketHeader: { padding: 20, backgroundColor: theme.surface, borderRadius: 15, marginHorizontal: 15, marginBottom: 15, marginTop: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
    ticketSubject: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
    ticketDescription: { fontSize: 15, color: theme.textSecondary, lineHeight: 22, fontStyle: 'italic' },
    messageList: { flex: 1 },
    messageRow: { flexDirection: 'row', marginVertical: 8, paddingHorizontal: 15, alignItems: 'flex-end' },
    myMessageRow: { justifyContent: 'flex-end' },
    theirMessageRow: { justifyContent: 'flex-start' },
    sideActionsContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 8, bottom: 20 },
    sideActionButton: { padding: 5 },
    messageBubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, elevation: 2 },
    myMessageBubble: { backgroundColor: theme.primary, borderBottomRightRadius: 5 },
    theirMessageBubble: { backgroundColor: theme.surface, borderBottomLeftRadius: 5 },
    myMessageText: { color: "#FFF", fontSize: 16 },
    theirMessageText: { color: theme.text, fontSize: 16 },
    timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    myTimestamp: { color: '#FFFFFF99' },
    theirTimestamp: { color: theme.textSecondary },
    
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    infoText: {
        color: theme.textSecondary,
        fontSize: 13,
        marginLeft: 8,
    },
    
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: theme.surface },
    textInput: { flex: 1, backgroundColor: theme.background, color: theme.text, borderRadius: 25, paddingHorizontal: 18, paddingVertical: Platform.OS === 'ios' ? 12 : 8, marginRight: 10, fontSize: 16, maxHeight: 120 },
    sendButton: { backgroundColor: theme.primary, borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center', elevation: 4 },
    disabledButton: { backgroundColor: theme.disabled, elevation: 0 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '90%', backgroundColor: theme.surface, borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: theme.text },
    modalInput: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, minHeight: 100, textAlignVertical: 'top', marginBottom: 20, color: theme.text, fontSize: 16 },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    
    separator: { height: 1, backgroundColor: theme.border, marginVertical: 15 },
    attachmentTitle: { fontSize: 14, fontWeight: 'bold', color: theme.textSecondary, marginBottom: 10 },
    attachmentImage: { width: '100%', height: 200, borderRadius: 10, backgroundColor: theme.background },
    imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '100%', height: '80%' },
    closeButton: { position: 'absolute', top: Platform.OS === 'android' ? 20 : 60, right: 20, zIndex: 1, padding: 10 },
});