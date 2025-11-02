// screens/SubscriptionDashboardScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, FlatList, TextInput, SafeAreaView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import SubscriptionUserScreen from './SubscriptionUserScreen'; // Assuming this is correctly imported
import AddSubscriptionModal from './SubscriptionModal'; // Assuming this is correctly imported

// --- Reusable Subscriber List Item ---
const SubscriberListItem = ({ item, theme, isSelected, onSelect }) => {
    const styles = getStyles(theme);
    const statusMap = {
        active: { label: 'Active', color: theme.success },
        suspended: { label: 'Suspended', color: theme.warning },
        due: { label: 'Due', color: theme.danger },
        pending_installation: { label: 'Pending Install', color: theme.accent, planText: 'Awaiting Installation' },
        pending_verification: { label: 'Pending App', color: theme.accent, planText: 'Awaiting Verification' },
        pending_change: { label: 'Plan Change', color: theme.accent, planText: 'Awaiting Plan Change' },
    };

    const status = statusMap[item.status] || { label: item.status, color: theme.textSecondary };
    const planText = status.planText || item.activePlanName || 'No Active Plan';

    return (
        <Animatable.View animation="fadeInUp" duration={500}>
            <TouchableOpacity
                style={[styles.subscriberItem, isSelected && styles.subscriberItemSelected]}
                onPress={() => onSelect(item._id)}
            >
                <View style={styles.subscriberAvatar}>
                    {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
                    ) : (
                        <Ionicons name="person" size={24} color={theme.textSecondary} />
                    )}
                </View>
                <View style={styles.subscriberInfo}>
                    <Text style={styles.subscriberName} numberOfLines={1}>{item.displayName}</Text>
                    <Text style={styles.subscriberPlan} numberOfLines={1}>{planText}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                    <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                </View>
            </TouchableOpacity>
        </Animatable.View>
    );
};

// --- Section Header Component ---
const SectionHeader = ({ title, theme }) => (
    <View style={getStyles(theme).sectionHeader}>
        <Text style={getStyles(theme).sectionHeaderText}>{title}</Text>
    </View>
);


export default function SubscriptionDashboardScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    const navigation = useNavigation();
    const { width } = useWindowDimensions();

    const [masterData, setMasterData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all', 'pending', 'active'

    // State for the modal
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [plans, setPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        address: '',
        city: 'Rodriguez',
        province: 'Rizal',
        zipCode: '1860',
        phoneNumber: '',
    });
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const isWideScreen = width > 800;

    const statusOptions = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Pending' },
        { key: 'active', label: 'Active' },
        { key: 'suspended', label: 'Suspended' },
        { key: 'due', label: 'Due' },
    ];

    const isPending = (status) => ['pending_installation', 'pending_verification', 'pending_change'].includes(status);
    const isActive = (status) => status === 'active';

    const fetchData = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const response = await api.get('/admin/subscribers/list');
            const subscribers = response.data || [];

            const processedData = subscribers.map(sub => ({
                ...sub,
                isPending: isPending(sub.status),
                isActive: isActive(sub.status),
            }));

            setMasterData(processedData);
            applyFilter(processedData, selectedStatusFilter, searchQuery);

            if (isWideScreen && !selectedUserId && processedData.length > 0) {
                setSelectedUserId(processedData[0]._id);
            }
        } catch (error) {
            console.error("Fetch Data Error:", error.response?.data || error.message);
            showAlert("Error", "Could not fetch subscriber data.", [{ text: "OK" }]);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    }, [showAlert, isWideScreen, selectedUserId, selectedStatusFilter, searchQuery]);

    const applyFilter = useCallback((data, statusFilter, query) => {
        let filtered = data;
        const lowercasedQuery = query.toLowerCase();

        if (statusFilter === 'pending') {
            filtered = filtered.filter(item => item.isPending);
        } else if (statusFilter === 'active') {
            filtered = filtered.filter(item => item.isActive);
        } else if (statusFilter === 'suspended') {
            filtered = filtered.filter(item => item.status === 'suspended');
        } else if (statusFilter === 'due') {
            filtered = filtered.filter(item => item.status === 'due');
        }

        if (query) {
            filtered = filtered.filter(item =>
                (item.displayName?.toLowerCase().includes(lowercasedQuery)) ||
                (item.email?.toLowerCase().includes(lowercasedQuery))
            );
        }
        setFilteredData(filtered);
    }, []);

    useEffect(() => {
        applyFilter(masterData, selectedStatusFilter, searchQuery);
    }, [searchQuery, masterData, selectedStatusFilter, applyFilter]);

    useFocusEffect(useCallback(() => {
        fetchData(true);
    }, [fetchData]));

    const handleSelectUser = (userId) => {
        if (isWideScreen) {
            setSelectedUserId(userId);
        } else {
            navigation.navigate('SubscriptionUser', { userId });
        }
    };

    const fetchPlans = async () => {
        setIsLoadingPlans(true);
        try {
            const response = await api.get('/admin/plans');
            setPlans(response.data.filter(p => p.isActive));
        } catch (error) {
            console.error("Fetch Plans Error:", error);
            showAlert("Error", "Could not fetch subscription plans.");
        } finally {
            setIsLoadingPlans(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const resetModalState = () => {
        setFormData({ displayName: '', email: '', password: '', address: '', city: 'Rodriguez', province: 'Rizal', zipCode: '1860', phoneNumber: '' });
        setSelectedPlanId(null);
    };

    const handleCreateSubscription = async () => {
        if (!formData.displayName || !formData.email || !formData.password || !selectedPlanId || !formData.address || !formData.city || !formData.province) {
            showAlert("Validation Error", "Please fill in all required fields and select a plan.");
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = {
                planId: selectedPlanId,
                user: {
                    displayName: formData.displayName,
                    email: formData.email,
                    password: formData.password,
                    phoneNumber: formData.phoneNumber,
                },
                installationAddress: {
                    address: formData.address,
                    phase: formData.phase,
                    city: formData.city,
                    province: formData.province,
                    zipCode: formData.zipCode
                }
            };
            await api.post('/admin/subscriptions/manual', payload);
            showAlert("Success", `Subscription for '${formData.displayName}' is being processed.`);
            setIsModalVisible(false);
            fetchData(false);
        } catch (error) {
            const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
            showAlert("Creation Failed", errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openModal = () => {
        resetModalState();
        fetchPlans();
        setIsModalVisible(true);
    };

    if (isLoading && !masterData.length) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }

    const SubscriberList = () => (
        <View style={[styles.leftPane, !isWideScreen && { width: '100%' }]}>
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>Subscribers</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('PlanManagement')}>
                            <Ionicons name="options-outline" size={18} color={theme.textOnPrimary} />
                            <Text style={styles.addButtonText}>Plans</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.addButton} onPress={openModal}>
                            <Ionicons name="add" size={20} color={theme.textOnPrimary} />
                            <Text style={styles.addButtonText}>New Sub</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.headerSubtitle}>{filteredData.length} result{filteredData.length !== 1 && 's'} found</Text>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by Name or Email..."
                        placeholderTextColor={theme.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <View style={styles.filterContainer}>
                {statusOptions.map((option) => (
                    <TouchableOpacity
                        key={option.key}
                        style={[
                            styles.filterButton,
                            selectedStatusFilter === option.key && styles.filterButtonSelected
                        ]}
                        onPress={() => setSelectedStatusFilter(option.key)}
                    >
                        <Text style={[
                            styles.filterButtonText,
                            selectedStatusFilter === option.key && styles.filterButtonTextSelected
                        ]}>{option.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredData}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                    let header = null;
                    const currentIndex = filteredData.indexOf(item);

                    if (currentIndex === 0) {
                        if (item.isPending && selectedStatusFilter === 'all') header = <SectionHeader title="Pending" theme={theme} />;
                        else if (item.isActive && selectedStatusFilter === 'all') header = <SectionHeader title="Active" theme={theme} />;
                        else if (item.status === 'suspended' && selectedStatusFilter === 'all') header = <SectionHeader title="Suspended" theme={theme} />;
                        else if (item.status === 'due' && selectedStatusFilter === 'all') header = <SectionHeader title="Due" theme={theme} />;
                    } else {
                        const prevItem = filteredData[currentIndex - 1];
                        if (item.isPending && !prevItem.isPending && selectedStatusFilter === 'all') {
                            header = <SectionHeader title="Pending" theme={theme} />;
                        } else if (item.isActive && !prevItem.isActive && selectedStatusFilter === 'all') {
                            header = <SectionHeader title="Active" theme={theme} />;
                        } else if (item.status === 'suspended' && prevItem.status !== 'suspended' && selectedStatusFilter === 'all') {
                             header = <SectionHeader title="Suspended" theme={theme} />;
                        } else if (item.status === 'due' && prevItem.status !== 'due' && selectedStatusFilter === 'all') {
                             header = <SectionHeader title="Due" theme={theme} />;
                        }
                    }

                    return (
                        <>
                            {header}
                            <SubscriberListItem
                                item={item}
                                theme={theme}
                                isSelected={isWideScreen && selectedUserId === item._id}
                                onSelect={handleSelectUser}
                            />
                        </>
                    );
                }}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={50} color={theme.textSecondary} />
                        <Text style={styles.emptyText}>No Subscribers Found</Text>
                    </View>
                }
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.dashboardContainer}>
                {isWideScreen ? (
                    <>
                        <SubscriberList />
                        <View style={styles.rightPane}>
                            {selectedUserId ? (
                                <SubscriptionUserScreen
                                    route={{ params: { userId: selectedUserId } }}
                                    navigation={navigation}
                                />
                            ) : (
                                <View style={styles.centered}>
                                    <Ionicons name="person-circle-outline" size={80} color={theme.border} />
                                    <Text style={styles.placeholderTitle}>Select a Subscriber</Text>
                                    <Text style={styles.placeholderText}>Choose a subscriber from the list to view their details.</Text>
                                </View>
                            )}
                        </View>
                    </>
                ) : (
                    <SubscriberList />
                )}
            </View>

            <AddSubscriptionModal
                theme={theme}
                isModalVisible={isModalVisible}
                setIsModalVisible={setIsModalVisible}
                plans={plans}
                isLoadingPlans={isLoadingPlans}
                selectedPlanId={selectedPlanId}
                setSelectedPlanId={setSelectedPlanId}
                formData={formData}
                handleInputChange={handleInputChange}
                handleCreateSubscription={handleCreateSubscription}
                isSubmitting={isSubmitting}
            />
        </SafeAreaView>
    );
}

// --- Styles ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, // Reduced padding slightly
    dashboardContainer: { flexDirection: 'row', flex: 1 },
    leftPane: {
        width: 380, // Slightly wider pane for more breathing room
        borderRightWidth: 1,
        borderRightColor: theme.border,
        backgroundColor: theme.surface,
    },
    header: {
        padding: 20, // Increased padding
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.surface,
        marginBottom: 12, // More space below header
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8 // More space below title row
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10, // Slightly more space between action buttons
    },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: theme.text, marginRight: 5 }, // Larger title
    addButton: { flexDirection: 'row', backgroundColor: theme.primary, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' }, // Larger buttons
    addButtonText: { color: theme.textOnPrimary, fontWeight: '500', marginLeft: 2 }, // Slightly larger text
    headerSubtitle: { color: theme.textSecondary, marginBottom: 20, fontSize: 12 }, // Larger subtitle font, more space
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.background,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        height: 48, // Consistent height
        paddingHorizontal: 10,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: '100%', color: theme.text, fontSize: 16 },

    // Filter styles
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20, // Consistent padding with header
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.surface,
        marginBottom: 10, // Space below filters
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 18, // Slightly wider buttons
        borderRadius: 8,
        marginRight: 10, // More space between buttons
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.background,
    },
    filterButtonSelected: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
    },
    filterButtonText: {
        color: theme.textSecondary,
        fontWeight: '600',
        fontSize: 14,
    },
    filterButtonTextSelected: {
        color: theme.textOnPrimary,
    },

    listContainer: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 30 }, // More padding for list content
    subscriberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15, // Increased vertical padding
        paddingHorizontal: 16,
        marginHorizontal: 10, // More horizontal margin
        borderRadius: 12,
        marginBottom: 8, // More space between list items
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
    },
    subscriberItemSelected: {
        backgroundColor: `${theme.primary}1A`,
        borderColor: theme.primary,
    },
    subscriberAvatar: {
        width: 50, // Larger avatar
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16, // More space between avatar and info
    },
    avatarImage: { width: '100%', height: '100%', borderRadius: 25 },
    subscriberInfo: { flex: 1 },
    subscriberName: { fontSize: 17, fontWeight: '600', color: theme.text }, // Slightly larger name
    subscriberPlan: { fontSize: 14, color: theme.textSecondary, marginTop: 4 }, // More space for plan
    statusBadge: {
        paddingHorizontal: 12, // Slightly larger badge
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 13, // Slightly larger badge text
        fontWeight: '600',
    },
    rightPane: {
        flex: 1,
        backgroundColor: theme.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20, // Ensure content has padding
    },
    placeholderTitle: {
        fontSize: 20, // Larger title
        fontWeight: 'bold',
        color: theme.text,
        marginTop: 12, // More space
    },
    placeholderText: {
        fontSize: 15, // Larger text
        color: theme.textSecondary,
        textAlign: 'center',
        marginTop: 6,
        paddingHorizontal: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        color: theme.textSecondary,
        marginTop: 10,
        fontSize: 16,
    },

    // Section Header Styles
    sectionHeader: {
        backgroundColor: theme.surface,
        paddingHorizontal: 10,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        marginBottom: 5, 
        marginHorizontal: 10, 
        borderTopLeftRadius: 8, 
        borderTopRightRadius: 8,
    },
    sectionHeaderText: {
        fontSize: 19,
        fontWeight: 'bold',
        color: theme.text,
    },
});