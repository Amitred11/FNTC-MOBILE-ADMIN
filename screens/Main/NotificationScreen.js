import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, Pressable, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';

// --- HELPER FUNCTIONS ---
const timeSince = (dateString) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}y ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}mo ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}m ago`;
    return `${Math.floor(seconds)}s ago`;
};

const getNotificationIcon = (type, theme) => {
    switch (type) {
        case 'billing': return { name: 'receipt-outline', color: '#3498db' };
        case 'support': return { name: 'headset-outline', color: '#f39c12' };
        case 'subscription': return { name: 'document-text-outline', color: '#1abc9c' };
        case 'system': return { name: 'cog-outline', color: '#95a5a6' };
        case 'chat': return { name: 'chatbubbles-outline', color: '#9b59b6' };
        default: return { name: 'notifications-outline', color: theme.textSecondary };
    }
};

// --- NOTIFICATION ITEM COMPONENT ---
const NotificationItem = ({ item, theme, adminId, onPress, onLongPress, selectionMode, isSelected }) => {
    const icon = getNotificationIcon(item.type, theme);
    const styles = getStyles(theme);
    const isUnread = !item.readBy.some(reader => reader.adminId === adminId);

    const containerStyle = [
        styles.itemContainer,
        isUnread && styles.unreadItemContainer,
        isSelected && styles.selectedItemContainer
    ];

    return (
        <Pressable onPress={onPress} onLongPress={onLongPress}>
            <View style={containerStyle}>
                {selectionMode ? (
                    <View style={styles.checkboxContainer}>
                        <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={24} color={theme.primary} />
                    </View>
                ) : (
                    <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
                        <Ionicons name={icon.name} size={28} color={icon.color} />
                    </View>
                )}
                <View style={styles.textContainer}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
                </View>
                <Text style={styles.itemTimestamp}>{timeSince(item.createdAt)}</Text>
            </View>
        </Pressable>
    );
};

// --- MAIN SCREEN COMPONENT ---
export default function NotificationScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation();
    const { showAlert } = useAlert();
    const { user: currentAdmin } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const fetchNotifications = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setIsLoading(true); else setIsRefreshing(true);
        try {
            const { data } = await api.get('/admin/notifications');
            setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        } catch (error) { 
            showAlert('Fetch Error', 'Could not fetch notifications.'); 
            setNotifications([]); 
        } finally { 
            if (!isRefresh) setIsLoading(false); else setIsRefreshing(false); 
        }
    }, [showAlert]);
    
    useFocusEffect(useCallback(() => { fetchNotifications(); }, [fetchNotifications]));

    const handleMarkAllRead = async () => {
        try {
            await api.post('/admin/notifications/mark-all-read');
            await fetchNotifications(true); 
        } catch (error) {
            showAlert('Error', 'Could not mark all notifications as read.');
        }
    };
    
    const handleLongPress = (id) => {
        setSelectionMode(true);
        setSelectedIds([id]);
    };
    
    const handleToggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const handleCancelSelection = () => {
        setSelectionMode(false);
        setSelectedIds([]);
    };
    
    const handleSelectAll = () => {
        if (selectedIds.length === notifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n._id));
        }
    };

    const handleBack = () => {
       if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Dashboard');
        }
    };

    const handleDeleteSelected = () => {
        showAlert('Delete Notifications', `Are you sure you want to delete ${selectedIds.length} notification(s)?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                const originalNotifications = [...notifications];
                setNotifications(prev => prev.filter(n => !selectedIds.includes(n._id)));
                
                try {
                    await api.delete('/admin/notifications', { data: { notificationIds: selectedIds } });
                } catch (error) {
                    showAlert('Error', 'Failed to delete notifications. Please try again.');
                    setNotifications(originalNotifications);
                } finally {
                    handleCancelSelection();
                }
            }},
        ]);
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: selectionMode ? `${selectedIds.length} Selected` : 'Notifications',
            headerLeft: () =>
                selectionMode ? (
                    <TouchableOpacity onPress={handleCancelSelection} style={{ marginLeft: 15 }}>
                        <Ionicons name="close" size={28} color={theme.text} />
                    </TouchableOpacity>
                ) : <TouchableOpacity onPress={handleBack} style={{ marginLeft: 20, marginRight: 10 }}>
                        <Ionicons name="arrow-back-outline" size={28} color={theme.textOnPrimary} />
                    </TouchableOpacity>,
            headerRight: () => {
                if (selectionMode) {
                    return (
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={handleSelectAll} style={{ marginRight: 20 }}>
                                <Ionicons name="file-tray-full-outline" size={26} color={theme.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDeleteSelected} disabled={selectedIds.length === 0}>
                                <Ionicons name="trash-outline" size={26} color={selectedIds.length > 0 ? theme.danger : theme.text + '80'} />
                            </TouchableOpacity>
                        </View>
                    );
                }
                const hasUnread = (notifications || []).some(n => !n.readBy.some(r => r.adminId === currentAdmin?._id));
                return (
                    <TouchableOpacity onPress={handleMarkAllRead} disabled={!hasUnread} style={{ marginRight: 15 }}>
                        <Ionicons name="checkmark-done-outline" size={26} color={hasUnread ? theme.text : theme.text + '80'} />
                    </TouchableOpacity>
                );
            },
        });
    }, [navigation, selectionMode, selectedIds, notifications, theme, currentAdmin]);

    const handleNotificationPress = async (item) => {
        const currentAdminId = currentAdmin?._id;
        const isAlreadyRead = item.readBy.some(r => r.adminId === currentAdminId);

        if (!isAlreadyRead) {
            try {
                setNotifications(prev => prev.map(n => 
                    n._id === item._id 
                    ? { ...n, readBy: [...n.readBy, { adminId: currentAdminId, readAt: new Date() }] } 
                    : n
                ));
                await api.put(`/admin/notifications/${item._id}/read`);
            } catch (error) {
                 console.error("Failed to mark notification as read", error);
                 fetchNotifications(true);
            }
        }

        if (item.link) {
            const parts = item.link.split('/').filter(Boolean);
            if (parts.length >= 2) {
                const resource = parts[parts.length - 2];
                const resourceId = parts[parts.length - 1];

                if (resource === 'job-orders') {
                    const parentTab = currentAdmin?.role === 'admin' ? 'Jobs' : 'MyJobsTab';
                    navigation.navigate('AdminMain', {
                        screen: parentTab,
                        params: {
                            screen: 'JobOrderDetail',
                            params: { jobId: resourceId },
                        },
                    });
                } else {
                    const routeMap = {
                        tickets: 'TicketDetail',
                        bills: 'BillDetail',
                        users: 'SubscriptionUser',
                    };
                    const paramMap = {
                        tickets: { ticketId: resourceId },
                        bills: { billId: resourceId },
                        users: { userId: resourceId },
                    };
                    
                    if (routeMap[resource]) {
                        navigation.navigate(routeMap[resource], paramMap[resource]);
                    } else {
                        console.warn(`Unhandled navigation link: ${item.link}`);
                    }
                }
            }
        }
    };

    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }
        
    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={notifications}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <NotificationItem 
                        item={item} 
                        theme={theme}
                        adminId={currentAdmin?._id}
                        selectionMode={selectionMode}
                        isSelected={selectedIds.includes(item._id)}
                        onPress={() => selectionMode ? handleToggleSelection(item._id) : handleNotificationPress(item)}
                        onLongPress={() => !selectionMode && handleLongPress(item._id)}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Ionicons name="notifications-off-outline" size={80} color={theme.textSecondary} />
                        <Text style={styles.emptyTitle}>No Notifications Yet</Text>
                        <Text style={styles.emptyText}>System alerts and important updates will appear here.</Text>
                    </View>
                }
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl 
                        refreshing={isRefreshing} 
                        onRefresh={() => fetchNotifications(true)} 
                        tintColor={theme.primary} 
                    />
                }
            />
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    listContainer: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginTop: 20 },
    emptyText: { color: theme.textSecondary, fontSize: 16, marginTop: 8, textAlign: 'center' },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.surface,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.border,
        boxShadow: '2px 4px 2px rgba(0,0,0,0.4)',
        marginVertical: 6,
    },
    unreadItemContainer: {
        backgroundColor: theme.unreadBackground,
        borderColor: theme.primary + '50',
    },
    selectedItemContainer: {
        borderColor: theme.primary,
        backgroundColor: theme.primary + '15',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    checkboxContainer: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    textContainer: { flex: 1, marginRight: 10 },
    itemTitle: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 3 },
    itemMessage: { fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
    itemTimestamp: { fontSize: 12, color: theme.textSecondary, alignSelf: 'flex-start', marginTop: 4 },
    headerActions: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
});