// screens/OpenTicketsScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { Ionicons } from '@expo/vector-icons';

const getStatusStyle = (status, theme) => {
    switch (status) {
        case 'Open': return { color: theme.primary, bg: `${theme.primary}20`, icon: 'alert-circle-outline' };
        case 'In Progress': return { color: theme.accent, bg: `${theme.accent}20`, icon: 'sync-circle-outline' };
        case 'Resolved': return { color: theme.success, bg: `${theme.success}20`, icon: 'checkmark-circle-outline' };
        case 'Closed': return { color: theme.textSecondary, bg: `${theme.textSecondary}20`, icon: 'lock-closed-outline' };
        default: return { color: theme.textSecondary, bg: theme.border, icon: 'help-circle-outline' };
    }
};

const TicketListCard = ({ item, onPress, theme }) => {
    const styles = getStyles(theme);
    const statusStyle = getStatusStyle(item.status, theme);

    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
            <View style={[styles.statusIndicator, { backgroundColor: statusStyle.color }]} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.subject}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>{item.status}</Text>
                    </View>
                </View>
                <Text style={styles.cardUser}>
                    From: <Text style={{ fontWeight: '600', color: theme.text }}>{item.userId?.displayName || 'Unknown User'}</Text>
                </Text>
                <View style={styles.cardFooter}>
                    <Text style={styles.cardInfo}>Ticket #{item.ticketNumber}</Text>
                    <Text style={styles.cardInfo}>
                        Updated: {new Date(item.updatedAt).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function OpenTicketsScreen({ navigation }) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    const [masterTickets, setMasterTickets] = useState([]);
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [activeTab, setActiveTab] = useState('Open');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchAllTickets = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const { data } = await api.get('/admin/tickets');
            setMasterTickets(data.data || []);
        } catch (error) {
            showAlert("Error", "Could not fetch tickets.", [{ text: "OK" }]);
        } finally {
            if (showLoader) setIsLoading(false);
            setRefreshing(false);
        }
    }, [showAlert]);

    useFocusEffect(useCallback(() => { fetchAllTickets(true); }, [fetchAllTickets]));

    React.useEffect(() => {
        let tickets = masterTickets;

        if (activeTab !== 'All') {
            const statuses = activeTab === 'Open' ? ['Open', 'In Progress'] : [activeTab];
            tickets = tickets.filter(t => statuses.includes(t.status));
        }

        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            tickets = tickets.filter(t =>
                t.subject.toLowerCase().includes(lowercasedQuery) ||
                (t.userId?.displayName && t.userId.displayName.toLowerCase().includes(lowercasedQuery))
            );
        }

        setFilteredTickets(tickets);

    }, [activeTab, searchQuery, masterTickets]);

    const onRefresh = useCallback(() => { setRefreshing(true); fetchAllTickets(false); }, [fetchAllTickets]);

    const handlePressTicket = (ticket) => {
        navigation.navigate('TicketDetail', { ticketId: ticket._id });
    };

    if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;

    const tabs = ['Open', 'Resolved', 'All'];

    return (
        <SafeAreaView style={styles.container}>
             <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={theme.textSecondary} style={{marginLeft: 10}}/>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search subject or user..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>
            <View style={styles.filterContainer}>
                {tabs.map(tab => (
                    <TouchableOpacity key={tab} style={[styles.filterTab, activeTab === tab && styles.filterTabActive]} onPress={() => setActiveTab(tab)}>
                        <Text style={[styles.filterText, activeTab === tab && styles.filterTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <FlatList
                data={filteredTickets}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => <TicketListCard item={item} onPress={handlePressTicket} theme={theme} />}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Ionicons name="file-tray-outline" size={60} color={theme.textSecondary} />
                        <Text style={styles.emptyText}>No tickets match the current filter.</Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    header: { paddingHorizontal: 20, paddingTop: 15, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 10 },
    searchInput: { flex: 1, height: 48, paddingHorizontal: 10, color: theme.text, fontSize: 16 },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: theme.surface,
    },
    filterTab: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: theme.surface },
    filterTabActive: { backgroundColor: theme.primary },
    filterText: { color: theme.textSecondary, fontWeight: 'bold', fontSize: 14 },
    filterTextActive: { color: 'white' },
    listContainer: { paddingHorizontal: 20, paddingTop: 15, flexGrow: 1 },
    emptyText: { color: theme.textSecondary, fontStyle: 'italic', fontSize: 16, marginTop: 10 },
    card: {
        backgroundColor: theme.surface,
        borderRadius: 15,
        marginBottom: 15,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
        overflow: 'hidden',
    },
    statusIndicator: {
        width: 6,
        borderTopLeftRadius: 15,
        borderBottomLeftRadius: 15,
    },
    cardContent: {
        flex: 1,
        padding: 15,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    cardTitle: { fontSize: 17, fontWeight: 'bold', color: theme.text, flex: 1, marginRight: 10 },
    cardUser: { fontSize: 14, color: theme.textSecondary, lineHeight: 20, marginBottom: 15 },
    cardInfo: { fontSize: 13, color: theme.textSecondary },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15 },
    statusBadgeText: { fontSize: 12, fontWeight: 'bold' },
});