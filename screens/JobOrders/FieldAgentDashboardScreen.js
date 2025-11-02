import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api'; // Assuming you have a configured api service
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../contexts/AlertContext';

// --- Reusable Components (No Changes) ---

const StatCard = ({ title, value, color, icon, theme }) => {
    const styles = getStyles(theme);
    const backgroundColor = color + '20'; // Adds ~12% opacity to the color
    return (
        <View style={[styles.statCard, { backgroundColor }]}>
            <View style={styles.statIconContainer}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={styles.statCardValue}>{value}</Text>
            <Text style={styles.statCardTitle}>{title}</Text>
        </View>
    );
};

const AgentJobCard = ({ item, theme, navigation }) => {
    const styles = getStyles(theme);
    const statusStyles = {
        'Pending Acceptance': { backgroundColor: '#FEF9C3', color: '#854D0E', icon: 'help-circle-outline' },
        'Assigned': { backgroundColor: '#E0E7FF', color: '#4338CA', icon: 'person-add-outline' },
        'In Progress': { backgroundColor: '#DBEAFE', color: '#1D4ED8', icon: 'construct-outline' },
        'On Hold': { backgroundColor: '#FEF3C7', color: '#B45309', icon: 'pause-circle-outline' },
        'Completed': { backgroundColor: '#D1FAE5', color: '#065F46', icon: 'checkmark-done-outline' },
    };
    const status = statusStyles[item.status] || { backgroundColor: theme.border, color: theme.textSecondary, icon: 'help-circle-outline' };
    const customerName = item.userId ? item.userId.displayName : (item.customerDetails?.name || 'N/A');
    const customerAddress = item.userId?.profile ? 
        [item.userId.profile.address, item.userId.profile.city, item.userId.profile.province].filter(Boolean).join(', ') : 
        (item.customerDetails?.address || 'Address not available');

    const getButtonText = () => {
        switch (item.status) {
            case 'Pending Acceptance':
                return 'Review & Accept';
            case 'Completed':
                return 'View History';
            case 'On Hold':
                return 'Resume Work';
            default:
                return 'View & Update';
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardJobId}>{item.jobId || `JO-${item._id.slice(-6)}`}</Text>
                    <Text style={styles.cardCustomerName}>{customerName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.backgroundColor }]}>
                    <Ionicons name={status.icon} size={14} color={status.color} />
                    <Text style={[styles.statusBadgeText, { color: status.color }]}>{item.status}</Text>
                </View>
            </View>
            <View style={styles.cardInfoRow}>
                <Ionicons name="build-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.cardInfoText}>{item.type}</Text>
            </View>
            <View style={styles.cardInfoRow}>
                <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.cardInfoText} numberOfLines={1}>{customerAddress}</Text>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity 
                    style={styles.actionButtonPrimary} 
                    onPress={() => navigation.navigate('JobOrderDetail', { jobId: item._id })}
                >
                    <Text style={styles.actionButtonPrimaryText}>{getButtonText()}</Text>
                    <Ionicons name="arrow-forward-circle-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
};


// --- Field Agent Dashboard Screen ---

export default function FieldAgentDashboardScreen({ navigation }) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    const [stats, setStats] = useState({ todaysJobs: 0, pending: 0, inProgress: 0, completed: 0 });
    const [allJobs, setAllJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('Active'); // 'Active' or 'Completed'

    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setIsLoading(true);
        try {
            const { data } = await api.get('/admin/job-orders/my-tasks');
            setAllJobs(data);
            
            const today = new Date().toISOString().split('T')[0];
            
            // --- UPDATED STATS LOGIC ---
            setStats({
                todaysJobs: data.filter(j => j.scheduledDate?.startsWith(today) && j.status !== 'Completed').length,
                pending: data.filter(j => ['Pending Acceptance', 'Assigned', 'On Hold'].includes(j.status)).length,
                inProgress: data.filter(j => j.status === 'In Progress').length,
                completed: data.filter(j => j.status === 'Completed').length, // <-- CHANGED: Now counts all completed jobs
            });
            
        } catch (error) {
            console.error("Fetch Jobs Error:", error.response?.data || error.message);
            showAlert("Error", "Could not fetch your assigned jobs.");
        } finally {
            setIsLoading(false);
        }
    }, [showAlert]);

    useFocusEffect(useCallback(() => {
        fetchData();
    }, [fetchData]));
    
    const displayedJobs = useMemo(() => {
        const activeStatuses = ['Pending Acceptance', 'Assigned', 'In Progress', 'On Hold'];
        if (selectedTab === 'Active') {
            return allJobs
                .filter(j => activeStatuses.includes(j.status))
                .sort((a, b) => {
                    const statusOrder = { 'Pending Acceptance': 1, 'In Progress': 2, 'On Hold': 3, 'Assigned': 4 };
                    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
                });
        }
        return allJobs
            .filter(j => j.status === 'Completed')
            .sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate));
    }, [allJobs, selectedTab]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <FlatList
                ListHeaderComponent={
                    <View style={styles.listHeaderContainer}>
                        <Text style={styles.headerTitle}>My Dashboard</Text>
                        
                        <View style={styles.statsContainer}>
                            <StatCard title="Today's Jobs" value={stats.todaysJobs} color="#4338CA" icon="calendar-outline" theme={theme}/>
                            <StatCard title="Pending" value={stats.pending} color="#B45309" icon="hourglass-outline" theme={theme}/>
                            <StatCard title="In Progress" value={stats.inProgress} color="#1D4ED8" icon="construct-outline" theme={theme}/>
                            {/* --- CHANGED TITLE AND VALUE --- */}
                            <StatCard title="Completed" value={stats.completed} color="#065F46" icon="checkmark-done-outline" theme={theme}/>
                        </View>
                        
                        <View style={styles.tabContainer}>
                            <TouchableOpacity 
                                style={[styles.tab, selectedTab === 'Active' && styles.activeTab]}
                                onPress={() => setSelectedTab('Active')}>
                                <Text style={[styles.tabText, selectedTab === 'Active' && styles.activeTabText]}>Active Jobs</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tab, selectedTab === 'Completed' && styles.activeTab]}
                                onPress={() => setSelectedTab('Completed')}>
                                <Text style={[styles.tabText, selectedTab === 'Completed' && styles.activeTabText]}>Job History</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                data={displayedJobs}
                renderItem={({ item }) => <AgentJobCard item={item} theme={theme} navigation={navigation} />}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContentContainer}
                ListEmptyComponent={
                    !isLoading && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="file-tray-outline" size={60} color={theme.border} />
                            <Text style={styles.emptyText}>
                                {selectedTab === 'Active' ? 'You have no active job orders.' : 'You have no completed jobs.'}
                            </Text>
                        </View>
                    )
                }
                refreshControl={
                    <RefreshControl 
                        refreshing={isLoading} 
                        onRefresh={() => fetchData(true)} 
                        tintColor={theme.primary} 
                    />
                }
            />
        </SafeAreaView>
    );
}

// --- Styles (No Changes) ---
const getStyles = (theme) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    listHeaderContainer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 16 },
    statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statCard: { width: '48.5%', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
    statIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statCardValue: { color: theme.text, fontSize: 26, fontWeight: 'bold' },
    statCardTitle: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
    tabContainer: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 10, padding: 4, borderWidth: 1, borderColor: theme.border, marginTop: 16 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    activeTab: { backgroundColor: theme.primary },
    tabText: { color: theme.textSecondary, fontWeight: '600' },
    activeTabText: { color: '#FFFFFF' },
    listContentContainer: { paddingHorizontal: 16, paddingBottom: 24 },
    card: { backgroundColor: theme.surface, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    cardJobId: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
    cardCustomerName: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginTop: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusBadgeText: { fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
    cardInfoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
    cardInfoText: { color: theme.text, fontSize: 14, marginLeft: 8, flexShrink: 1 },
    cardActions: { padding: 16, paddingTop: 20 },
    actionButtonPrimary: { flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: theme.primary, paddingVertical: 14 },
    actionButtonPrimaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { textAlign: 'center', color: theme.textSecondary, fontSize: 16, marginTop: 10 },
});