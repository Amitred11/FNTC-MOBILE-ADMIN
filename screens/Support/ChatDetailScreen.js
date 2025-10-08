// screens/ChatDetailScreen.js
import React, { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { 
    View, Text, FlatList, TextInput, TouchableOpacity, 
    StyleSheet, ActivityIndicator, KeyboardAvoidingView, 
    Platform, SafeAreaView, Image 
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

// --- SECTION 1: REUSABLE UI COMPONENTS ---

const MessageBubble = React.memo(({ item, theme, showAvatar, userPhotoUrl }) => {
    const styles = getStyles(theme);

    // --- 💡 FIX: Changed the check from 'type' to 'senderId' for reliability ---
    // This correctly identifies the system message even if the 'type' field is not saved in the database.
    if (item.senderId === 'system') {
        return (
            <View style={styles.systemMessageContainer}>
                <View style={styles.separatorLine} />
                <Text style={styles.systemMessageText}>{item.text}</Text>
                <View style={styles.separatorLine} />
            </View>
        );
    }

    const isMyMessage = item.isAdmin === true;
    const timestamp = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <View style={[styles.messageRow, isMyMessage ? styles.myMessageRow : styles.theirMessageRow]}>
            {!isMyMessage && showAvatar && (
                <Image 
                    source={userPhotoUrl ? { uri: userPhotoUrl } : require('../../assets/images/default-avatar.jpg')}
                    style={styles.avatar}
                />
            )}
            <View style={[styles.messageContent, !isMyMessage && !showAvatar && styles.indented]}>
                <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble]}>
                    <Text style={isMyMessage ? styles.myMessageText : styles.theirMessageText}>{item.text}</Text>
                </View>
                <Text style={isMyMessage ? styles.myTimestamp : styles.theirTimestamp}>{timestamp}</Text>
            </View>
        </View>
    );
});

const MessageInput = React.memo(({ value, onChangeText, onSend, isSending, theme }) => {
    const styles = getStyles(theme);
    const canSend = value.trim() !== '' && !isSending;
    return (
        <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                />
            </View>
            <TouchableOpacity
                style={[styles.sendButton, !canSend && styles.disabledButton]}
                onPress={onSend}
                disabled={!canSend}
            >
                {isSending ? (
                    <ActivityIndicator size="small" color={theme.textOnPrimary} />
                ) : (
                    <Ionicons name="send" size={20} color={theme.textOnPrimary} />
                )}
            </TouchableOpacity>
        </View>
    );
});

const TypingIndicator = ({ theme, userPhotoUrl }) => {
    const styles = getStyles(theme);
    return (
        <View style={[styles.messageRow, styles.theirMessageRow]}>
            <Image 
                source={userPhotoUrl ? { uri: userPhotoUrl } : require('../../assets/images/default-avatar.jpg')}
                style={styles.avatar}
            />
            <View style={styles.messageContent}>
                <View style={[styles.messageBubble, styles.theirMessageBubble, styles.typingBubble]}>
                    <ActivityIndicator size="small" color={theme.text} />
                </View>
            </View>
        </View>
    );
};

// --- SECTION 2: MAIN CHAT DETAIL SCREEN ---

export default function ChatDetailScreen({ route, navigation }) {
    const { chatId } = route.params;
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    const { user: adminUser } = useAuth();
    const flatListRef = useRef(null);

    const [isUserTyping, setIsUserTyping] = useState(false); // New state
    const [session, setSession] = useState(null);
    const [messages, setMessages] = useState([]); // Unified message state
    const [isLoading, setIsLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const typingTimeoutRef = useRef(null); // Ref for debounce timeout


    const fetchChat = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setIsLoading(true);
        try {
            const { data } = await api.get(`/admin/chats/${chatId}`);
            setSession(data);
            setMessages(data.messages || []); 
            setIsUserTyping(data.isUserTyping || false);
            if (isInitialLoad) {
                navigation.setOptions({ title: data.userId?.displayName || 'Chat' });
            }
        } catch (error) {
            const defaultAction = [{ text: "OK" }];
            const backAction = [{ text: "OK", onPress: () => navigation.goBack() }];
            showAlert("Error", "Could not fetch chat details.", isInitialLoad ? backAction : defaultAction);
        } finally {
            if (isInitialLoad) setIsLoading(false);
        }
    }, [chatId, navigation, showAlert]);

    useEffect(() => {
        if (!chatId) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (newMessage.trim() === '') return;

        typingTimeoutRef.current = setTimeout(() => {
            api.post(`/admin/chats/${chatId}/typing`).catch(err => console.log("Failed to send admin typing event"));
        }, 500);

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [newMessage, chatId]);

    useEffect(() => {
        fetchChat(true);
        const intervalId = setInterval(() => fetchChat(false), 5000); 
        return () => clearInterval(intervalId);
    }, [fetchChat]);
    
    const handleCloseChat = useCallback(() => {
        showAlert( "Close Chat", "Are you sure you want to close this chat session?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Close", style: "destructive", onPress: async () => {
                    try {
                        await api.post(`/admin/chats/${chatId}/close`);
                        navigation.goBack();
                    } catch (error) {
                        showAlert("Error", "Could not close the chat.", [{ text: "OK" }]);
                    }
                }}
            ]
        );
    }, [chatId, navigation, showAlert]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: () => (
                <View style={styles.headerTitleContainer}>
                    <Image source={session?.userId?.photoUrl ? { uri: session.userId.photoUrl } : require('../../assets/images/default-avatar.jpg')} style={styles.headerAvatar}/>
                    <Text style={styles.headerTitleText}>{session?.userId?.displayName || 'Chat'}</Text>
                </View>
            ),
            headerRight: () => (
                <TouchableOpacity onPress={handleCloseChat} style={{ marginRight: 15 }}>
                    <Ionicons name="close-circle" size={26} color={theme.textOnPrimary} />
                </TouchableOpacity>
            )
        });
    }, [navigation, theme, session, handleCloseChat]);

    const handleSend = async () => {
        if (!newMessage.trim() || isSending) return;
        
        const tempId = Date.now().toString();
        const sentMessage = { 
            _id: tempId, text: newMessage, isAdmin: true, 
            senderName: adminUser?.displayName || 'Admin', 
            timestamp: new Date().toISOString() 
        };
        
        setMessages(prevMessages => [...prevMessages, sentMessage]);
        setNewMessage('');
        setIsSending(true);
        flatListRef.current?.scrollToEnd({ animated: true });

        try {
            const { data: finalMessage } = await api.post(`/admin/chats/${chatId}/message`, { text: newMessage });
            setMessages(prev => prev.map(m => m._id === tempId ? finalMessage : m));
        } catch (error) {
            showAlert("Error", "Failed to send message.", [{ text: "OK" }]);
            setMessages(prev => prev.filter(m => m._id !== tempId));
            setTimeout(() => fetchChat(false), 300);
        } finally {
            setIsSending(false);
        }
    };
    
    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>;
    }
    
    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={[theme.background, theme.surface]} style={StyleSheet.absoluteFill} />
            <View style={{ flex: 1 }}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item, index }) => {
                        const prevMessage = messages[index - 1]; 
                        const showAvatar = !prevMessage || prevMessage.isAdmin !== item.isAdmin || (prevMessage && prevMessage.senderId === 'system');
                        return (
                            <MessageBubble 
                                item={item} 
                                theme={theme} 
                                showAvatar={showAvatar}
                                userPhotoUrl={session?.userId?.photoUrl}
                            />
                        );
                    }}
                    style={styles.messageList}
                    contentContainerStyle={{ paddingVertical: 8, flexGrow: 1, justifyContent: 'flex-end' }}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListFooterComponent={isUserTyping ? <TypingIndicator theme={theme} userPhotoUrl={session?.userId?.photoUrl} /> : null}
                />
                <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <MessageInput
                    value={newMessage}
                    onChangeText={setNewMessage}
                    onSend={handleSend}
                    isSending={isSending}
                    theme={theme}
                />
            </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}

// --- SECTION 3: STYLESHEET ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    
    // Header
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
    headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    headerTitleText: { color: theme.textOnPrimary, fontSize: 18, fontWeight: 'bold' },

    // Message List
    messageList: { paddingHorizontal: 15 },

    // Message Bubbles (Admin is "my", User is "their")
    messageRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-start' },
    myMessageRow: { justifyContent: 'flex-end' },
    theirMessageRow: { justifyContent: 'flex-start' },
    avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    messageContent: { maxWidth: '80%' },
    indented: { marginLeft: 46 }, // avatar width + margin
    messageBubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
    myMessageBubble: { backgroundColor: theme.primary },
    theirMessageBubble: { backgroundColor: theme.border },
    myMessageText: { color: theme.textOnPrimary, fontSize: 16, lineHeight: 22 },
    theirMessageText: { color: theme.text, fontSize: 16, lineHeight: 22 },
    theirTimestamp: { color: theme.textSecondary, fontSize: 11, marginTop: 4, marginLeft: 4 },
    myTimestamp: { color: theme.textSecondary, fontSize: 11, marginTop: 4, alignSelf: 'flex-end', marginRight: 4 },
    typingBubble: {
        width: 60,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // System Message
    systemMessageContainer: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
        marginVertical: 15, paddingHorizontal: 10,
    },
    separatorLine: { flex: 1, height: 1, backgroundColor: theme.border },
    systemMessageText: {
        color: theme.textSecondary, fontSize: 12, fontWeight: '500', marginHorizontal: 10,
    },

    // Input Area
    inputContainer: {
      alignItems: 'flex-end', backgroundColor: theme.surface,
      borderTopColor: theme.border, borderTopWidth: 1,
      flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10,
    },
    inputWrapper: {
        flex: 1, backgroundColor: theme.background,
        borderRadius: 22, marginRight: 10, borderWidth: 1, borderColor: theme.border
    },
    input: {
      color: theme.text, fontSize: 16, maxHeight: 120,
      paddingHorizontal: 15, 
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      minHeight: 44,
    },
    sendButton: {
      alignItems: 'center', backgroundColor: theme.primary,
      borderRadius: 22, height: 44, justifyContent: 'center', width: 44,
    },
    disabledButton: { backgroundColor: theme.disabled },
});