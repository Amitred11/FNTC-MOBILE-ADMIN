// screens/SubscriptionDashboardScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, FlatList, TextInput, SafeAreaView, TouchableOpacity, useWindowDimensions
 } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import SubscriptionUserScreen from './SubscriptionUserScreen';
import AddSubscriptionModal from './SubscriptionModal';

// --- Reusable Subscriber List Item ---
const SubscriberListItem = ({ item, theme, isSelected, onSelect }) => {
    const styles = getStyles(theme);
    const statusMap = {
        active: { label: 'Active', color: theme.success },
        suspended: { label: 'Suspended', color: theme.warning },
        due: { label: 'Due', color: theme.danger },
        pending_installation: { label: 'Pending Install', color: theme.accent, planText: 'Awaiting Installation' },
        pending_verification: { label: 'Pending App', color: theme.accent, planText: 'Awaiting Verification' }, // <-- ADD THIS
        pending_change: { label: 'Plan Change', color: theme.accent, planText: 'Awaiting Plan Change'  },
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
                    <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
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

    });
    const [isLoadingPlans, setIsLoadingPlans] = useState(false);
    const isWideScreen = width > 800;

    const fetchData = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const response = await api.get('/admin/subscribers/list');
            const subscribers = response.data || [];
            setMasterData(subscribers);
            setFilteredData(subscribers);

            if (isWideScreen && !selectedUserId && subscribers.length > 0) {
                setSelectedUserId(subscribers[0]._id);
            }
        } catch (error) {
            console.error("Fetch Data Error:", error.response?.data || error.message);
            showAlert("Error", "Could not fetch subscriber data.", [{ text: "OK" }]);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    }, [showAlert, isWideScreen, selectedUserId]);

    useFocusEffect(useCallback(() => { fetchData(true); }, [fetchData]));

    useEffect(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        const data = searchQuery
            ? masterData.filter(item =>
                (item.displayName?.toLowerCase().includes(lowercasedQuery)) ||
                (item.email?.toLowerCase().includes(lowercasedQuery))
              )
            : masterData;
        setFilteredData(data);
    }, [searchQuery, masterData]);

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

    // --- RENDER ---
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
            <FlatList
                data={filteredData}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <SubscriberListItem
                        item={item}
                        theme={theme}
                        isSelected={isWideScreen && selectedUserId === item._id}
                        onSelect={handleSelectUser}
                    />
                )}
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

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background, padding: 30 },
    dashboardContainer: { flexDirection: 'row', flex: 1 },
    leftPane: {
        width: 360,
        borderRightWidth: 1,
        borderRightColor: theme.border,
        backgroundColor: theme.surface,
    },
    header: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginRight: 12 },
    addButton: { flexDirection: 'row', backgroundColor: theme.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
    addButtonText: { color: theme.textOnPrimary, fontWeight: '600', marginLeft: 4 },
    headerSubtitle: { color: theme.textSecondary, marginBottom: 16 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
    searchIcon: { marginHorizontal: 12 },
    searchInput: { flex: 1, height: 44, color: theme.text, fontSize: 16 },
    listContainer: { paddingBottom: 20, paddingTop: 8 },
    subscriberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        boxShadow: '2px 4px 2px rgba(0,0,0,0.4)'
    },
    subscriberItemSelected: {
        backgroundColor: `${theme.primary}1A`,
        borderColor: theme.primary, 
    },
    subscriberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarImage: { width: '100%', height: '100%', borderRadius: 22},
    subscriberInfo: { flex: 1 },
    subscriberName: { fontSize: 16, fontWeight: '600', color: theme.text },
    subscriberPlan: { fontSize: 14, color: theme.textSecondary, marginTop: 2 },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    rightPane: {
        flex: 1,
        backgroundColor: theme.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
        marginTop: 10,
    },
    placeholderText: {
        fontSize: 14,
        color: theme.textSecondary,
        textAlign: 'center',
        marginTop: 4,
        paddingHorizontal: 20,
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    emptyText: {
        color: theme.textSecondary,
        marginTop: 8,
        fontSize: 15,
    },
});