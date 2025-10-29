// screens/LiveChatsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, SafeAreaView, TextInput, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now - messageDate) / 1000);

    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const ChatSessionCard = ({ item, onPress, theme }) => {
    const styles = getStyles(theme);
    const lastMessage = item.messages?.[item.messages.length - 1];
    const userName = item.userId?.displayName || 'Unknown User';
    
    const isUnread = lastMessage && !lastMessage.isAdmin; 

    return (
        <Animatable.View animation="fadeInUp" duration={500}>
            <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
                <View style={styles.avatarContainer}>
                    <Image 
                        source={item.userId?.photoUrl ? { uri: item.userId.photoUrl } : require('../../assets/images/default-avatar.jpg')} 
                        style={styles.avatar} 
                    />
                    {isUnread && <View style={styles.unreadDot} />}
                </View>
                <View style={styles.cardTextContainer}>
                    <Text style={[styles.cardTitle, isUnread && { fontWeight: 'bold' }]}>{userName}</Text>
                    <Text style={[styles.cardSubtitle, isUnread && { color: theme.text }]} numberOfLines={1}>
                        {lastMessage ? lastMessage.text : 'New session started...'}
                    </Text>
                </View>
                <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>
                        {lastMessage ? formatTimeAgo(lastMessage.timestamp) : formatTimeAgo(item.createdAt)}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animatable.View>
    );
};


export default function LiveChatsScreen({ navigation }) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    const [masterChats, setMasterChats] = useState([]);
    const [filteredChats, setFilteredChats] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchChats = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setIsLoading(true);
        try {
            const { data } = await api.get('/admin/chats');
            setMasterChats(data);
        } catch (error) {
            if(isInitialLoad) showAlert("Error", "Could not fetch active chats.", [{ text: "OK" }]);
        } finally {
            if(isInitialLoad) setIsLoading(false);
            setRefreshing(false);
        }
    }, [showAlert]);
    
    useFocusEffect(
        useCallback(() => {
            fetchChats(true); 
            const intervalId = setInterval(() => {
                fetchChats(false);
            }, 10000);

            return () => clearInterval(intervalId); 
        }, [fetchChats])
    );
    
    useEffect(() => {
        if (searchQuery === '') {
            setFilteredChats(masterChats);
        } else {
            const lowercasedQuery = searchQuery.toLowerCase();
            const filtered = masterChats.filter(chat =>
                chat.userId?.displayName?.toLowerCase().includes(lowercasedQuery)
            );
            setFilteredChats(filtered);
        }
    }, [searchQuery, masterChats]);

    const onRefresh = useCallback(() => { setRefreshing(true); fetchChats(false); }, [fetchChats]);

    const handlePressChat = (chatItem) => {
        navigation.navigate('ChatDetail', { chatId: chatItem._id });
    };
    
    if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Live Chats</Text>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by user name..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>
            <FlatList
                data={filteredChats}
                keyExtractor={(item) => item._id}
                renderItem={({ item, index }) => <ChatSessionCard item={item} onPress={handlePressChat} theme={theme} index={index} />}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubbles-outline" size={60} color={theme.textSecondary} />
                        <Text style={styles.emptyText}>No Active Chats</Text>
                        <Text style={styles.emptySubtext}>New user chats will appear here.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 15, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
    searchIcon: { marginRight: 8, marginLeft: 12 },
    searchInput: { flex: 1, height: 45, color: theme.text, fontSize: 16 },
    listContainer: { paddingHorizontal: 15, paddingTop: 10, flexGrow: 1 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    emptyText: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginTop: 15 },
    emptySubtext: { color: theme.textSecondary, fontSize: 15, marginTop: 5, textAlign: 'center' },
    card: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, 
        borderRadius: 12, padding: 15, marginBottom: 12, 
    },
    avatarContainer: { marginRight: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    unreadDot: {
        position: 'absolute', top: 0, right: 0, width: 14, height: 14,
        borderRadius: 7, backgroundColor: theme.primary, borderWidth: 2, borderColor: theme.surface,
    },
    cardTextContainer: { flex: 1 },
    cardTitle: { fontSize: 16, color: theme.text, marginBottom: 4 },
    cardSubtitle: { fontSize: 14, color: theme.textSecondary },
    timeContainer: { alignItems: 'flex-end', marginLeft: 10 },
    timeText: { fontSize: 12, color: theme.textSecondary, fontWeight: '500' },
});