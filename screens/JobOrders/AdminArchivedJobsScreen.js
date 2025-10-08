// screens/AdminArchivedJobsScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlert } from '../../contexts/AlertContext';

// --- REDESIGNED LIST ITEM ---
const ArchivedJobItem = ({ item, theme, onDelete }) => {
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    const customerName = item.userId?.displayName || 'Deleted User';
    const archivedDate = new Date(item.archivedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const handleDeletePress = () => {
        showAlert(
            "Confirm Permanent Deletion",
            `Are you sure you want to permanently delete the job for "${customerName}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => onDelete(item._id) }
            ]
        );
    };

    return (
        <View style={styles.itemContainer}>
            <LinearGradient
                colors={['#6c757d', '#343a40']}
                style={styles.iconContainer}
            >
                <Ionicons name="archive" size={30} color="#FFFFFF" />
            </LinearGradient>
            
            <View style={styles.detailsContainer}>
                <Text style={styles.itemType}>{item.type} Job</Text>
                <Text style={styles.itemDescription}>For: {customerName}</Text>
                <View style={styles.footer}>
                    <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                    <Text style={styles.itemDate}>Archived on {archivedDate}</Text>
                </View>
            </View>
            
            <TouchableOpacity onPress={handleDeletePress} style={styles.deleteButton}>
                <Ionicons name="trash-bin-outline" size={24} color={theme.danger} />
            </TouchableOpacity>
        </View>
    );
};

// --- MAIN SCREEN COMPONENT ---
export default function AdminArchivedJobsScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    const [archivedJobs, setArchivedJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // --- FIX: The async function must be called *inside* the effect callback ---
    const fetchArchivedJobs = useCallback(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get('/admin/job-orders/archive');
                setArchivedJobs(data);
            } catch (error) {
                console.error("Failed to fetch archived jobs:", error);
                // Provide a more descriptive error message for 400 errors
                const errorMessage = error.response?.status === 400
                    ? "Could not load the job archive due to a bad request. Please contact support."
                    : "Could not load the job archive.";
                showAlert("Error", errorMessage);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [showAlert]);

    // This hook now correctly calls the function when the screen is focused
    useFocusEffect(fetchArchivedJobs);

    const handleDeleteJob = async (jobId) => {
        try {
            const response = await api.delete(`/admin/job-orders/archive/${jobId}`);
            showAlert("Success", response.data.message);
            setArchivedJobs(prevJobs => prevJobs.filter(job => job._id !== jobId));
        } catch (error) {
            showAlert("Deletion Failed", error.response?.data?.message || "An error occurred.");
        }
    };

    if (isLoading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={archivedJobs}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => <ArchivedJobItem item={item} theme={theme} onDelete={handleDeleteJob} />}
                ListHeaderComponent={
                    <Text style={styles.screenTitle}>Job Order Archive</Text>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="file-tray-outline" size={80} color={theme.border} />
                        <Text style={styles.emptyTitle}>The Archive is Empty</Text>
                        <Text style={styles.emptySubtitle}>Completed jobs that have been archived will appear here.</Text>
                    </View>
                }
                contentContainerStyle={{ padding: 15 }}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchArchivedJobs} tintColor={theme.primary} />}
            />
        </SafeAreaView>
    );
}

// --- NEW VISUALLY STUNNING STYLES ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    screenTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 20,
        paddingHorizontal: 5,
    },
    itemContainer: {
        backgroundColor: theme.surface,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: theme.border,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    detailsContainer: { flex: 1, justifyContent: 'center' },
    itemType: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 4,
    },
    itemDescription: {
        fontSize: 15,
        color: theme.textSecondary,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    itemDate: {
        fontSize: 12,
        color: theme.textSecondary,
        marginLeft: 5,
    },
    deleteButton: {
        padding: 12,
        borderRadius: 22,
        marginLeft: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: '30%',
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.text,
        marginTop: 20,
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 16,
        color: theme.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});