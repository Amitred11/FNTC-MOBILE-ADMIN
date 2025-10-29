import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import CreateBillModal from './components/CreateBillModal';

const getStatusStyle = (status, theme) => {
    switch (status) {
        case 'Paid': return { icon: 'checkmark-circle', color: theme.success, bg: '#E8F5E9' };
        case 'Pending Verification': return { icon: 'hourglass-outline', color: '#8E44AD', bg: '#F3E5F5' };
        case 'Overdue': return { icon: 'alert-circle', color: theme.danger, bg: '#FDEBEB' };
        case 'Due': 
            return { icon: 'information-circle', color: '#F39C12', bg: '#FFF3E0' };
        case 'Upcoming': return { icon: 'calendar-outline', color: theme.accent, bg: `${theme.accent}20` };
        default: return { icon: 'ellipse-outline', color: theme.textSecondary, bg: theme.border };
    }
};

const BillItem = ({ item, theme, onPress, onLongPress, isSelected, selectionMode }) => {
    const statusStyle = getStatusStyle(item.status, theme);
    const styles = getStyles(theme);
    const customerName = item.userId?.displayName || item.customerDetails?.name || "N/A";

    return (
        <TouchableOpacity style={styles.billItem} onPress={onPress} onLongPress={onLongPress}>
            {selectionMode && (
                <View style={styles.checkboxContainer}>
                    <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={theme.primary} />
                </View>
            )}
            <View style={[styles.statusIndicator, { backgroundColor: statusStyle.color }]} />
            <View style={styles.billItemContent}>
                <View style={{ flex: 1 }}>
                   <Text style={styles.billUser} numberOfLines={1}>{customerName}</Text>                    
                   <Text style={styles.billDate}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
                </View>
                <View style={styles.billAmountContainer}>
                    <Text style={styles.billAmount}>₱{item.amount.toFixed(2)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Ionicons name={statusStyle.icon} size={16} color={statusStyle.color} />
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>{item.status}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const FilterTabs = ({ selected, onSelect, theme }) => {
    const tabs = ["All", "Overdue", "Due", "Paid"];
    const styles = getStyles(theme);
    return (
        <View style={styles.filterContainer}>
            {tabs.map(tab => (
                <TouchableOpacity
                    key={tab}
                    style={[styles.filterTab, selected === tab && styles.filterTabActive]}
                    onPress={() => onSelect(tab)}
                >
                    <Text style={[styles.filterText, selected === tab && styles.filterTextActive]}>{tab}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

export default function AdminBillingScreen() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const styles = getStyles(theme);
    const navigation = useNavigation();
    const [masterBills, setMasterBills] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showAlert } = useAlert();
    const [filter, setFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedBills, setSelectedBills] = useState([]);

    const fetchBills = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/admin/bills');
            setMasterBills(response.data);
        } catch (error) {
            showAlert('Error', 'Could not fetch billing information.');
        } finally { setIsLoading(false); }
    }, [showAlert]);

    useFocusEffect(
        useCallback(() => {
            fetchBills();
        }, [fetchBills])
    );

    const handleModal = (allowedRoles) => {
      if (allowedRoles.includes(user?.role)) {
        setCreateModalVisible(true);
      } else {
        showAlert("Access Denied", "You do not have permission to create a bill.");
      }
    };

    const filteredBills = useMemo(() => {
        return masterBills
            .filter(bill => bill.status !== 'Partially Paid')
            .filter(bill => bill.status !== 'Voided')
            .filter(bill => {
                if (filter === 'All') return true;
                if (filter === 'Overdue') return bill.status === 'Overdue';
                if (filter === 'Due') return bill.status === 'Due' || bill.status === 'Pending Verification';
                if (filter === 'Paid') return bill.status === 'Paid';
                return true;
            })
            .filter(bill => {
                if (!searchQuery) return true;
                const lowercasedQuery = searchQuery.toLowerCase();
                const userName = bill.userId?.displayName?.toLowerCase() || '';
                const customerName = bill.customerDetails?.name?.toLowerCase() || '';
                return userName.includes(lowercasedQuery) || customerName.includes(lowercasedQuery);
            });
    }, [masterBills, filter, searchQuery]);

    const handleToggleSelection = (billId) => {
        setSelectedBills(prev =>
            prev.includes(billId) ? prev.filter(id => id !== billId) : [...prev, billId]
        );
    };

    const handleLongPress = (billId) => {
        setSelectionMode(true);
        handleToggleSelection(billId);
    };
    
    const handleCancelSelection = () => {
        setSelectionMode(false);
        setSelectedBills([]);
    };

    const handleSelectAll = () => {
        const unpayableBills = filteredBills.filter(bill => bill.status !== 'Paid').map(b => b._id);
        if (selectedBills.length === unpayableBills.length) {
            setSelectedBills([]);
        } else {
            setSelectedBills(unpayableBills);
        }
    };

    const handleDeleteSelected = () => {
        showAlert('Confirm Deletion', `Are you sure you want to delete ${selectedBills.length} bill(s)? This action cannot be undone. Paid bills will be ignored.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                setIsLoading(true);
                try {
                    const response = await api.delete('/admin/bills', { data: { billIds: selectedBills } });
                    showAlert('Success', response.data.message);
                    handleCancelSelection();
                    await fetchBills();
                } catch (error) {
                    showAlert("Error", error.response?.data?.message || "Failed to delete bills.");
                    setIsLoading(false);
                }
            }}
        ]);
    };

    const renderHeader = () => {
        if (selectionMode) {
            return (
                <View style={styles.selectionHeader}>
                    <TouchableOpacity onPress={handleCancelSelection}><Text style={styles.selectionActionText}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleSelectAll}>
                        <Text style={styles.selectionActionText}>Select All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDeleteSelected} disabled={selectedBills.length === 0}>
                        <Text style={[styles.selectionActionText, { color: theme.danger, opacity: selectedBills.length === 0 ? 0.5 : 1 }]}>
                            Delete ({selectedBills.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Billing</Text>
                    <TouchableOpacity style={styles.createButton} onPress={() => handleModal(['admin'])}>
                        <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
                        <Text style={styles.createButtonText}>Create Bill</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={theme.textSecondary} style={{marginLeft: 10}} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by customer name..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <FilterTabs selected={filter} onSelect={setFilter} theme={theme} />
            </>
        );
    };

    if (isLoading && masterBills.length === 0) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>{renderHeader()}</View>
            {isLoading && <ActivityIndicator style={{ marginVertical: 10 }} color={theme.primary} />}
            <FlatList
                data={filteredBills}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <BillItem
                        item={item}
                        theme={theme}
                        selectionMode={selectionMode}
                        isSelected={selectedBills.includes(item._id)}
                        onPress={() => selectionMode ? handleToggleSelection(item._id) : navigation.navigate('BillDetail', { billId: item._id })}
                        onLongPress={() => handleLongPress(item._id)}
                    />
                )}
                ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No bills found.</Text></View>}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
            />
            <CreateBillModal
                theme={theme}
                isVisible={isCreateModalVisible}
                onClose={() => setCreateModalVisible(false)}
                onComplete={() => {
                    setCreateModalVisible(false);
                    showAlert('Success', 'The manual bill has been created successfully.');
                    fetchBills();
                }}
            />
        </SafeAreaView>
    );
}

// --- Styles (No changes needed) ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    emptyText: { color: theme.textSecondary, fontSize: 16, fontStyle: 'italic' },
    header: { padding: 16, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    selectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, paddingHorizontal: 8 },
    selectionActionText: { color: theme.primary, fontSize: 16, fontWeight: '600' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text },
    createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
    createButtonText: { marginLeft: 6, color: theme.primary, fontWeight: '600', fontSize: 16 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: theme.border },
    searchInput: { flex: 1, height: 48, paddingHorizontal: 10, color: theme.text, fontSize: 16 },
    filterContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F0F0F0', borderRadius: 25, padding: 4 },
    filterTab: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
    filterTabActive: { backgroundColor: theme.primary },
    filterText: { color: theme.textSecondary, fontWeight: '600' },
    filterTextActive: { color: 'white' },
    billItem: { backgroundColor: theme.surface, borderRadius: 12, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
    checkboxContainer: { paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
    statusIndicator: { width: 6, height: '100%' },
    billItemContent: { flex: 1, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billUser: { fontSize: 17, fontWeight: '600', color: theme.text, flexShrink: 1, marginRight: 8 },
    billAmountContainer: { alignItems: 'flex-end' },
    billAmount: { fontSize: 18, color: theme.text, fontWeight: 'bold', marginBottom: 6 },
    billDate: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
    statusText: { marginLeft: 6, fontSize: 12, fontWeight: 'bold' }
});