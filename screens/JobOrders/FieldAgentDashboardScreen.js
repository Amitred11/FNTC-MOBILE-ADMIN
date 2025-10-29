// screens/JobOrders/FieldAgentDashboardScreen.js

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api'; // Assuming you have a configured api service
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../contexts/AlertContext';

// --- Reusable Components ---

const StatCard = ({ title, value, color, icon, theme }) => {
    const styles = getStyles(theme);
    const backgroundColor = color + '20';
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
        'Pending Acceptance': { backgroundColor: '#FEF9C3', color: '#854D0E', icon: 'help-circle-outline' }, // <-- [NEW] Style for acceptance
        Pending: { backgroundColor: '#FEF3C7', color: '#B45309', icon: 'hourglass-outline' },
        'In progress': { backgroundColor: '#DBEAFE', color: '#1D4ED8', icon: 'construct-outline' },
        Scheduled: { backgroundColor: '#E0E7FF', color: '#4338CA', icon: 'calendar-outline' },
    };
    const status = statusStyles[item.status] || { backgroundColor: theme.border, color: theme.textSecondary, icon: 'help-circle-outline' };
    const customerName = item.userId ? item.userId.displayName : (item.customerDetails?.name || 'N/A');

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
                <Text style={styles.cardInfoText} numberOfLines={1}>{item.userId?.address || 'Address not available'}</Text>
            </View>
            <View style={styles.cardActions}>
                {item.status === 'Pending Acceptance' ? (
                     <TouchableOpacity 
                        style={styles.actionButtonPrimary} 
                        onPress={() => navigation.navigate('JobOrderDetail', { jobId: item._id })}
                    >
                        <Text style={styles.actionButtonPrimaryText}>Review & Accept</Text>
                        <Ionicons name="arrow-forward-circle-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        style={styles.actionButtonPrimary} 
                        onPress={() => navigation.navigate('JobOrderDetail', { jobId: item._id })}
                    >
                        <Text style={styles.actionButtonPrimaryText}>View Details & Update</Text>
                        <Ionicons name="arrow-forward-circle-outline" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};


// --- Field Agent Dashboard Screen ---

export default function FieldAgentDashboardScreen({ navigation }) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    const [stats, setStats] = useState({ today: 0, pending: 0, inProgress: 0, completed: 0 });
    const [activeJobs, setActiveJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setIsLoading(true);
        try {
            const { data } = await api.get('/admin/job-orders/my-tasks');
            
            const today = new Date().toISOString().split('T')[0];
            setStats({
                today: data.filter(j => j.scheduledDate?.startsWith(today) && j.status !== 'Completed').length,
                pending: data.filter(j => j.status === 'Pending' || j.status === 'Pending Acceptance').length, // <-- Updated stat
                inProgress: data.filter(j => j.status === 'In progress').length,
                completed: data.filter(j => j.status === 'Completed').length,
            });
            
            const activeStatuses = ['Pending', 'In progress', 'Scheduled', 'Pending Acceptance', 'Assigned'];
            setActiveJobs(data.filter(j => activeStatuses.includes(j.status)));

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

    return (
        <SafeAreaView style={styles.safeArea}>
            <FlatList
                ListHeaderComponent={
                    <View style={styles.listHeaderContainer}>
                        <Text style={styles.headerTitle}>My Job Queue</Text>
                        <View style={styles.statsContainer}>
                            <StatCard title="Today's Jobs" value={stats.today} color="#4338CA" icon="calendar-outline" theme={theme}/>
                            <StatCard title="Pending" value={stats.pending} color="#B45309" icon="hourglass-outline" theme={theme}/>
                            <StatCard title="In Progress" value={stats.inProgress} color="#1D4ED8" icon="construct-outline" theme={theme}/>
                            <StatCard title="Completed" value={stats.completed} color="#065F46" icon="checkmark-done-outline" theme={theme}/>
                        </View>
                        <Text style={styles.subHeaderTitle}>Active Assignments</Text>
                    </View>
                }
                data={activeJobs}
                renderItem={({ item }) => <AgentJobCard item={item} theme={theme} navigation={navigation} />}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContentContainer}
                ListEmptyComponent={
                    !isLoading && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="file-tray-outline" size={60} color={theme.border} />
                            <Text style={styles.emptyText}>You have no active job orders.</Text>
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

// --- Styles ---
const getStyles = (theme) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    listHeaderContainer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 16 },
    subHeaderTitle: { fontSize: 20, fontWeight: '600', color: theme.text, marginTop: 16 },
    listContentContainer: { paddingHorizontal: 16, paddingBottom: 24 },
    statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statCard: { width: '48.5%', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
    statIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statCardValue: { color: theme.text, fontSize: 26, fontWeight: 'bold' },
    statCardTitle: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
    
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