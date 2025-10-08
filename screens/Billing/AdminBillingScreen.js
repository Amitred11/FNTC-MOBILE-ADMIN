// screens/AdminBillingScreen.js
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../contexts/AlertContext';

const getStatusStyle = (status, theme) => {
    switch (status) {
        case 'Paid': return { icon: 'checkmark-circle', color: theme.success, bg: '#E8F5E9' };
        case 'Pending Verification': return { icon: 'hourglass-outline', color: '#8E44AD', bg: '#F3E5F5' };
        case 'Overdue': return { icon: 'alert-circle', color: theme.danger, bg: '#FDEBEB' };
        case 'Due': return { icon: 'information-circle', color: '#F39C12', bg: '#FFF3E0' };
        default: return { icon: 'ellipse-outline', color: theme.textSecondary, bg: theme.border };
    }
};

const BillItem = ({ item, theme, onPress }) => {
    const statusStyle = getStatusStyle(item.status, theme);
    return (
        <TouchableOpacity style={styles(theme).billItem} onPress={onPress}>
            <View style={[styles(theme).statusIndicator, { backgroundColor: statusStyle.color }]} />
            <View style={styles(theme).billItemContent}>
                <View>
                   <Text style={styles(theme).billUser}> {item.userId?.displayName? item.userId.displayName.length > 10? item.userId.displayName.slice(0, 20) + "..." : item.userId.displayName : "Unknown User"}</Text>                    
                   <Text style={styles(theme).billDate}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
                </View>
                <View style={styles(theme).billAmountContainer}>
                    <Text style={styles(theme).billAmount}>₱{item.amount.toFixed(2)}</Text>
                    <View style={[styles(theme).statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Ionicons name={statusStyle.icon} size={16} color={statusStyle.color} />
                        <Text style={[styles(theme).statusText, { color: statusStyle.color }]}>{item.status}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const FilterTabs = ({ selected, onSelect, theme }) => {
    const tabs = ["All", "Overdue", "Pending", "Paid"];
    return (
        <View style={styles(theme).filterContainer}>
            {tabs.map(tab => (
                <TouchableOpacity
                    key={tab}
                    style={[styles(theme).filterTab, selected === tab && styles(theme).filterTabActive]}
                    onPress={() => onSelect(tab)}
                >
                    <Text style={[styles(theme).filterText, selected === tab && styles(theme).filterTextActive]}>{tab}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};


export default function AdminBillingScreen() {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const [masterBills, setMasterBills] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showAlert } = useAlert();
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    useFocusEffect(
        useCallback(() => {
            const fetchBills = async () => {
                setIsLoading(true);
                try {
                    const response = await api.get('/admin/bills');
                    setMasterBills(response.data);
                } catch (error) {
                    showAlert('Error', 'Could not fetch billing information.');
                } finally { setIsLoading(false); }
            };
            fetchBills();
            return () => { setMasterBills([]); };
        }, [showAlert])
    );

    const filteredBills = useMemo(() => {
        return masterBills
            .filter(bill => {
                if (filter === 'All') return true;
                if (filter === 'Overdue') return bill.status === 'Overdue';
                if (filter === 'Pending') return bill.status === 'Pending Verification';
                if (filter === 'Paid') return bill.status === 'Paid';
                return true;
            })
            .filter(bill =>
                bill.userId?.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [masterBills, filter, searchQuery]);


    if (isLoading) {
        return <View style={styles(theme).centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles(theme).container}>
            <View style={styles(theme).header}>
                <Text style={styles(theme).headerTitle}>Billing</Text>
                <View style={styles(theme).searchContainer}>
                    <Ionicons name="search" size={20} color={theme.textSecondary} style={{marginLeft: 10}} />
                    <TextInput
                        style={styles(theme).searchInput}
                        placeholder="Search by user name..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <FilterTabs selected={filter} onSelect={setFilter} theme={theme} />
            </View>
            <FlatList
                data={filteredBills}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <BillItem item={item} theme={theme} onPress={() => navigation.navigate('BillDetail', { billId: item._id })}/>
                )}
                ListEmptyComponent={<View style={styles(theme).centered}><Text style={styles(theme).emptyText}>No bills found.</Text></View>}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
            />
        </SafeAreaView>
    );
}

const styles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    emptyText: { color: theme.textSecondary, fontSize: 16, fontStyle: 'italic' },
    header: { padding: 16, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 16 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
    searchInput: { flex: 1, height: 48, paddingHorizontal: 10, color: theme.text, fontSize: 16 },
    filterContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F0F0F0', borderRadius: 25, padding: 4 },
    filterTab: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
    filterTabActive: { backgroundColor: theme.primary },
    filterText: { color: theme.textSecondary, fontWeight: '600' },
    filterTextActive: { color: 'white' },
    billItem: {
        backgroundColor: theme.surface,
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    statusIndicator: { width: 6, height: '100%' },
    billItemContent: {
        flex: 1,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    billUser: { fontSize: 17, fontWeight: '600', color: theme.text },
    billAmountContainer: { alignItems: 'flex-end' },
    billAmount: { fontSize: 18, color: theme.text, fontWeight: 'bold', marginBottom: 6 },
    billDate: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
    statusText: { marginLeft: 6, fontSize: 12, fontWeight: 'bold' }
});