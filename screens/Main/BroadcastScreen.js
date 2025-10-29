// screens/Main/BroadcastScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';

// --- Main Broadcast Screen Component ---
export default function BroadcastScreen({navigation}) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    // Form State
    const [target, setTarget] = useState('all');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    // Modal & Data State
    const [isModalVisible, setModalVisible] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [userFetchError, setUserFetchError] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (isModalVisible && allUsers.length === 0) {
            fetchUsers();
        }
    }, [isModalVisible]);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        setUserFetchError(null); 
        try {
            const { data } = await api.get('/admin/users/list');
            setAllUsers(data);
        } catch (error) {
            const errorMessage = 'Could not fetch user list. Please try again.';
            showAlert('Error', errorMessage);
            setUserFetchError(errorMessage); 
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleSendBroadcast = async () => {
        if (!title.trim() || !message.trim()) {
            showAlert('Missing Information', 'Please enter a title and message.');
            return;
        }

        const payload = { title, message };
        if (target === 'specific' || target === 'single') {
            if (selectedUsers.length === 0) {
                showAlert('No Recipients', 'Please select at least one user.');
                return;
            }
            payload.userIds = selectedUsers.map(u => u._id);
        }

        setIsSending(true);
        try {
            const { data } = await api.post('/admin/broadcast', payload);
            showAlert('Success', data.message || 'Broadcast sent successfully.');
            setTitle('');
            setMessage('');
            setSelectedUsers([]);
            setTarget('all');
        } catch (error) {
            showAlert('Error', error.response?.data?.message || 'Failed to send broadcast.');
        } finally {
            setIsSending(false);
        }
    };

    const handleSelectUser = (user) => {
        if (target === 'single') {
            setSelectedUsers([user]);
            setModalVisible(false);
        } else {
            setSelectedUsers(prev =>
                prev.some(su => su._id === user._id)
                    ? prev.filter(su => su._id !== user._id)
                    : [...prev, user]
            );
        }
    };
    
    const handleCloseModal = () => {
        setModalVisible(false);
        setSearchText('');
        setUserFetchError(null); 
    };

    const filteredUsers = useMemo(() =>
        allUsers.filter(user =>
            user.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
            user.email.toLowerCase().includes(searchText.toLowerCase())
        ),
    [allUsers, searchText]);

    const renderTargetDescription = () => {
        switch(target) {
            case 'all': return 'All users (excluding admins) will receive this message.';
            case 'specific': return `${selectedUsers.length} user(s) selected.`;
            case 'single': return selectedUsers.length === 1 ? `${selectedUsers[0].displayName} selected.` : 'No user selected.';
            default: return '';
        }
    };

    const renderModalContent = () => {
        if (isLoadingUsers) {
            return <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 40 }}/>;
        }
        if (userFetchError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.emptyText}>{userFetchError}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                    const isSelected = selectedUsers.some(su => su._id === item._id);
                    return (
                        <TouchableOpacity style={styles.userItem} onPress={() => handleSelectUser(item)}>
                            <View style={styles.userNameContainer}>
                                <Text style={styles.userName}>{item.displayName}</Text>
                                <Text style={styles.userEmail}>{item.email}</Text>
                            </View>
                            <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={24} color={isSelected ? theme.primary : theme.textSecondary} />
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
            />
        );
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                    <Text style={styles.sectionTitle}>1. Choose Recipients</Text>
                    <View style={styles.targetContainer}>
                        <TouchableOpacity style={[styles.targetButton, target === 'all' && styles.targetButtonActive]} onPress={() => { setTarget('all'); setSelectedUsers([]); }}>
                            <Text style={[styles.targetButtonText, target === 'all' && styles.targetButtonTextActive]}>All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.targetButton, target === 'specific' && styles.targetButtonActive]} onPress={() => { setTarget('specific'); setSelectedUsers([]); }}>
                            <Text style={[styles.targetButtonText, target === 'specific' && styles.targetButtonTextActive]}>Specific</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.targetButton, target === 'single' && styles.targetButtonActive]} onPress={() => { setTarget('single'); setSelectedUsers([]); }}>
                            <Text style={[styles.targetButtonText, target === 'single' && styles.targetButtonTextActive]}>Single</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.descriptionContainer}>
                        <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
                        <Text style={styles.descriptionText}>{renderTargetDescription()}</Text>
                    </View>


                    {(target === 'specific' || target === 'single') && (
                        <TouchableOpacity style={styles.selectUserButton} onPress={() => setModalVisible(true)}>
                            <Ionicons name="people-outline" size={20} color={theme.primary} />
                            <Text style={styles.selectUserButtonText}>
                                {selectedUsers.length > 0 ? `Edit Selection (${selectedUsers.length})` : 'Select User(s)'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.sectionTitle}>2. Compose Message</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Notification Title"
                        value={title}
                        onChangeText={setTitle}
                        placeholderTextColor={theme.placeholder}
                    />
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter your message here..."
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        placeholderTextColor={theme.placeholder}
                    />
                </ScrollView>
                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.sendButton, isSending && styles.sendButtonDisabled]} onPress={handleSendBroadcast} disabled={isSending}>
                        {isSending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.sendButtonText}>Send Broadcast</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <Modal
                animationType="fade"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={handleCloseModal}
            >
                <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Users</Text>
                            <TouchableOpacity onPress={handleCloseModal}>
                                <Ionicons name="close-circle" size={30} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={theme.placeholder} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name or email..."
                                value={searchText}
                                onChangeText={setSearchText}
                                placeholderTextColor={theme.placeholder}
                            />
                        </View>
                        {renderModalContent()}
                         {target === 'specific' && !userFetchError && (
                            <TouchableOpacity style={styles.modalDoneButton} onPress={handleCloseModal}>
                                <Text style={styles.modalDoneButtonText}>Done</Text>
                            </TouchableOpacity>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContainer: { padding: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 16, marginTop: 24 },
    targetContainer: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 10, padding: 4, borderWidth: 1, borderColor: theme.border },
    targetButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    targetButtonActive: { backgroundColor: theme.primary },
    targetButtonText: { color: theme.textSecondary, fontWeight: '600' },
    targetButtonTextActive: { color: '#FFFFFF' },
    descriptionContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 4 },
    descriptionText: { marginLeft: 6, color: theme.textSecondary, fontSize: 13, flexShrink: 1 },
    selectUserButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingVertical: 14, marginTop: 16 },
    selectUserButtonText: { color: theme.primary, fontSize: 16, fontWeight: '600', marginLeft: 8 },
    input: { backgroundColor: theme.surface, paddingHorizontal: 16, height: 50, borderRadius: 10, borderWidth: 1, borderColor: theme.border, fontSize: 16, color: theme.text, marginBottom: 16 },
    textArea: { height: 150, textAlignVertical: 'top', paddingTop: 16 },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface },
    sendButton: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
    sendButtonDisabled: { backgroundColor: '#A0AEC0' },
    sendButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    
    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { width: '90%', maxHeight: '80%', backgroundColor: theme.background, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, marginHorizontal: 20, marginTop: 20, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border },
    searchInput: { flex: 1, height: 45, fontSize: 16, marginLeft: 8, color: theme.text },
    userItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
    userNameContainer: { flex: 1, marginRight: 16 },
    userName: { fontSize: 16, fontWeight: '600', color: theme.text },
    userEmail: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
    emptyText: { textAlign: 'center', marginTop: 30, marginBottom: 30, color: theme.textSecondary, fontSize: 15 },
    modalDoneButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', margin: 20 },
    modalDoneButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    errorContainer: { alignItems: 'center', paddingVertical: 20 },
    retryButton: { backgroundColor: theme.primary, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 30, marginTop: 10 },
    retryButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});