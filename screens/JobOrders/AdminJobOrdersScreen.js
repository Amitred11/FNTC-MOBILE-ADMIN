// screens/AdminJobOrdersScreen.js
import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlert } from '../../contexts/AlertContext';

const JobOrderItem = ({ item, theme, onPress }) => {
    const styles = getStyles(theme);
    const statusMap = {
        'Pending Assignment': { icon: 'person-add-outline', color: theme.warning, gradient: ['#FFC107', '#FFA000'] },
        'Pending Acceptance': { icon: 'hourglass-outline', color: '#4475a7', gradient: ['#85c5f8', '#4475a7'] },
        'Assigned': { icon: 'navigate-circle-outline', color: theme.primary, gradient: ['#2196F3', '#1976D2'] },
        'In Progress': { icon: 'construct-outline', color: theme.accent, gradient: ['#FF4081', '#F50057'] },
        'Completed': { icon: 'checkmark-done-circle-outline', color: theme.success, gradient: ['#4CAF50', '#388E3C'] },
        'Cancelled': { icon: 'close-circle-outline', color: theme.danger, gradient: ['#F44336', '#D32F2F'] },
    };
    const statusInfo = statusMap[item.status] || { icon: 'help-circle-outline', color: theme.textSecondary, gradient: ['#9E9E9E', '#616161'] };

    return (
        <TouchableOpacity style={styles.itemContainer} onPress={() => onPress(item._id)}>
            <LinearGradient colors={statusInfo.gradient} style={styles.iconContainer}>
                <Ionicons name={statusInfo.icon} size={32} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.detailsContainer}>
                <Text style={styles.itemType}>{item.type}</Text>
                <Text style={styles.itemDescription} numberOfLines={1}>{item.description}</Text>
                <View style={styles.footerContainer}>
                    <Text style={styles.itemDate}>Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
    );
};

export default function AdminJobOrdersScreen({ navigation }) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { user } = useAuth();
    const { showAlert } = useAlert(); // Use the alert context
    const [jobOrders, setJobOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useLayoutEffect(() => {
        if (user.role === 'admin' ) {
            navigation.setOptions({
                headerRight: () => (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AdminArchivedJobs')}
                        style={{ marginRight: 15, padding: 5 }}
                    >
                        <Ionicons name="archive-outline" size={28} color={theme.textOnPrimary} />
                    </TouchableOpacity>
                ),
            });
        }
    }, [navigation, user.role, theme]);

    const fetchJobOrders = useCallback(async () => {
        try {
            const endpoint = user.role === 'admin' ? '/admin/job-orders' : '/admin/job-orders/my-tasks';
            const { data } = await api.get(endpoint);
            setJobOrders(data);
        } catch (error) {
            console.error("Failed to fetch job orders:", error);
            showAlert("Error", "Could not fetch job orders."); // Replace Alert.alert with showAlert
        } finally {
            setIsLoading(false);
        }
    }, [user.role, showAlert]); // Add showAlert to dependency array

    useFocusEffect(useCallback(() => {
        setIsLoading(true);
        fetchJobOrders();
    }, [fetchJobOrders]));

    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={jobOrders}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => <JobOrderItem item={item} theme={theme} onPress={(jobId) => navigation.navigate('JobOrderDetail', { jobId })} />}
                ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No job orders found.</Text></View>}
                contentContainerStyle={{ padding: 15 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchJobOrders} tintColor={theme.primary} />}
            />
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    itemContainer: {
        backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', padding: 15,
        borderRadius: 15, marginBottom: 15, shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    },
    iconContainer: {
        width: 60, height: 60, borderRadius: 30, justifyContent: 'center',
        alignItems: 'center', marginRight: 15,
    },
    detailsContainer: { flex: 1 },
    itemType: { fontSize: 18, fontWeight: 'bold', color: theme.text },
    itemDescription: { fontSize: 14, color: theme.textSecondary, marginVertical: 4 },
    footerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    itemDate: { fontSize: 12, color: theme.textSecondary, fontStyle: 'italic' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, left: 12 },
    statusText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: theme.textSecondary, fontSize: 16 },
});