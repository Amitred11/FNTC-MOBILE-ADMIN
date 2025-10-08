// src/screens/admin/PlanManagementScreen.js
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    Modal,
    TextInput,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
    Switch,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';

export default function PlanManagementScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [isModalVisible, setModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPlan, setCurrentPlan] = useState(null);

    const [svgPickerVisible, setSvgPickerVisible] = useState(false);

    const iconOptions = [
        { label: 'Bronze', value: '<svg class="w-10 h-10 mb-2 text-yellow-700 animate-bounce" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" fill="#fbbf24"/></svg>' },
        { label: 'Silver', value: '<svg class="w-10 h-10 mb-2 text-gray-300 animate-bounce" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" fill="#e5e7eb"/></svg>' },
        { label: 'Gold', value: '<svg class="w-10 h-10 mb-2 text-yellow-400 animate-bounce" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" fill="#fff200"/></svg>' },
        { label: 'Platinum', value: '<svg class="w-10 h-10 mb-2 text-gray-200 drop-shadow-lg animate-bounce" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L15 9l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg>' },
        { label: 'Diamond', value: '<svg class="w-10 h-10 mb-2 text-[#56DEFC] animate-bounce" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 22 9 12 22 2 9 12 2" stroke-linejoin="round"/><polyline points="2 9 12 9 22 9" stroke-linejoin="round"/><polyline points="12 2 12 22" stroke-linejoin="round"/></svg>' },
        { label: 'None', value: '' }
    ];

    const fetchData = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        try {
            const response = await api.get('/admin/plans');
            setPlans(response.data || []);
        } catch (error) {
            console.error("Fetch Plans Error:", error.response?.data || error.message);
            showAlert("Error", "Could not fetch billing plans.", [{ text: "OK" }]);
        } finally {
            if (showLoader) setIsLoading(false);
            setRefreshing(false);
        }
    }, [showAlert]);

    useFocusEffect(useCallback(() => { fetchData(true); }, [fetchData]));

    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(false); }, [fetchData]);

    const openCreateModal = () => {
        setIsEditing(false);
        setCurrentPlan({
            name: '', price: '', priceLabel: '', features: '', isActive: true,
            note: '', iconSvg: iconOptions[0].value,
        });
        setModalVisible(true);
    };

    const openEditModal = (plan) => {
        setIsEditing(true);
        setCurrentPlan({ ...plan, features: plan.features.join('\n') });
        setModalVisible(true);
    };
    
    const handleSaveChanges = async () => {
        if (!currentPlan?.name || !currentPlan?.price || !currentPlan?.priceLabel) {
            return showAlert("Validation Error", "Plan Name, Price, and Price Label are required.");
        }

        const cleanedPlanData = {
            ...currentPlan,
            features: currentPlan.features.split('\n').filter(f => f.trim() !== ''),
        };

        try {
            if (isEditing) {
                await api.put(`/admin/plans/${currentPlan._id}`, cleanedPlanData);
                showAlert("Success", "Plan has been updated.");
            } else {
                await api.post('/admin/plans', cleanedPlanData);
                showAlert("Success", "New plan has been created.");
            }
            setModalVisible(false);
            fetchData(false);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Could not save the plan.");
        }
    };

    const handleDelete = (plan) => {
        showAlert("Confirm Deletion", `Are you sure you want to delete the plan "${plan.name}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    try {
                        await api.delete(`/admin/plans/${plan._id}`);
                        showAlert("Success", "Plan has been deleted.");
                        fetchData(false);
                    } catch (error) {
                        showAlert("Error", error.response?.data?.message || "Could not delete the plan.");
                    }
                }
            }
        ]);
    };

    const renderPlanItem = ({ item }) => {
        const cardColor = theme.primary;

        return (
            <View style={styles.card}>
                <View style={[styles.colorBar, { backgroundColor: cardColor }]} />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardIcon}>
                            {item.iconSvg ? (
                                <SvgXml xml={item.iconSvg} width="24" height="24" color={cardColor} />
                            ) : (
                                <View style={{ width: 24, height: 24 }} />
                            )}
                        </View>
                        <Text style={styles.planName}>{item.name}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: item.isActive ? theme.success : theme.textSecondary }]}>
                            <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
                        </View>
                    </View>
                    <Text style={[styles.planPrice, { color: cardColor }]}>{item.priceLabel}</Text>
                    <View style={styles.featuresContainer}>
                        {item.features.map((feature, index) => (
                            <View key={index} style={styles.featureItem}>
                                <Ionicons name="checkmark-circle-outline" size={16} color={theme.success} />
                                <Text style={styles.featureText}>{feature}</Text>
                            </View>
                        ))}
                    </View>
                    {item.note && <Text style={styles.noteText}>{item.note}</Text>}
                    <View style={styles.cardActions}>
                        <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => openEditModal(item)}>
                            <Ionicons name="create-outline" size={16} color={theme.textOnPrimary} />
                            <Text style={styles.buttonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(item)}>
                            <Ionicons name="trash-outline" size={16} color={theme.textOnPrimary} />
                            <Text style={styles.buttonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const selectedIconOption = iconOptions.find(opt => opt.value === currentPlan?.iconSvg);
    if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Plan Management</Text>
                <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                    <Ionicons name="add-circle" size={24} color={theme.textOnPrimary} />
                    <Text style={styles.addButtonText}>New Plan</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={plans}
                keyExtractor={(item) => item._id}
                renderItem={renderPlanItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="file-tray-stacked-outline" size={60} color={theme.textSecondary} />
                        <Text style={styles.emptyText}>No Plans Found</Text>
                        <Text style={styles.emptySubtext}>Create your first billing plan by tapping 'New Plan'.</Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
            />

            <Modal animationType="fade" transparent visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditing ? 'Edit Plan' : 'Create New Plan'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.label}>Plan Name</Text>
                            <TextInput style={styles.input} value={currentPlan?.name} onChangeText={text => setCurrentPlan(p => ({ ...p, name: text }))} placeholder="e.g., PLAN BRONZE" placeholderTextColor={theme.textSecondary} />

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Price (Numeric)</Text>
                                    <TextInput style={styles.input} value={String(currentPlan?.price)} onChangeText={text => setCurrentPlan(p => ({ ...p, price: text }))} keyboardType="numeric" placeholder="e.g., 700" placeholderTextColor={theme.textSecondary} />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Price Label</Text>
                                    <TextInput style={styles.input} value={currentPlan?.priceLabel} onChangeText={text => setCurrentPlan(p => ({ ...p, priceLabel: text }))} placeholder="e.g., ₱700/mo" placeholderTextColor={theme.textSecondary} />
                                </View>
                            </View>

                            <Text style={styles.label}>Icon</Text>
                            <TouchableOpacity style={styles.customSelector} onPress={() => setSvgPickerVisible(true)}>
                                {selectedIconOption?.value ? (
                                    <SvgXml xml={selectedIconOption.value} width="20" height="20" color={theme.text} style={styles.selectorIconPreview} />
                                ) : <View style={styles.selectorIconPreview} />}
                                <Text style={styles.selectorLabel}>{selectedIconOption ? selectedIconOption.label : 'Select an icon...'}</Text>
                                <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>

                            <Text style={styles.label}>Features (one per line)</Text>
                            <TextInput style={styles.inputMulti} multiline value={currentPlan?.features} onChangeText={text => setCurrentPlan(p => ({ ...p, features: text }))} placeholder="- Up to 25 Mbps" placeholderTextColor={theme.textSecondary} />

                            <Text style={styles.label}>Note</Text>
                            <TextInput style={styles.input} value={currentPlan?.note} onChangeText={text => setCurrentPlan(p => ({ ...p, note: text }))} placeholder="Best for light browsing..." placeholderTextColor={theme.textSecondary} />

                            <View style={styles.switchContainer}>
                                <Text style={styles.switchLabel}>Make Plan Active</Text>
                                <Switch
                                    trackColor={{ false: theme.border, true: theme.primary }}
                                    thumbColor={theme.surface}
                                    onValueChange={value => setCurrentPlan(p => ({ ...p, isActive: value }))}
                                    value={currentPlan?.isActive}
                                />
                            </View>
                        </ScrollView>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSaveChanges}>
                                <Ionicons name="checkmark-done-outline" size={20} color={theme.textOnPrimary} />
                                <Text style={styles.buttonText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            
            {/* SVG Icon Picker Modal */}
            <Modal visible={svgPickerVisible} transparent animationType="fade">
                <View style={styles.pickerOverlay}>
                    <View style={styles.pickerContainer}>
                        <Text style={styles.modalTitle}>Select an Icon</Text>
                        <ScrollView contentContainerStyle={styles.pickerGrid}>
                            {iconOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={styles.iconOption}
                                    onPress={() => {
                                        setCurrentPlan(p => ({ ...p, iconSvg: option.value }));
                                        setSvgPickerVisible(false);
                                    }}
                                >
                                    <SvgXml xml={option.value} width="40" height="40" color={theme.primary} />
                                    <Text style={styles.pickerOptionText}>{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setSvgPickerVisible(false)}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    /* All your styles from before... */
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
    addButtonText: { color: theme.textOnPrimary, fontWeight: 'bold', marginLeft: 6 },
    listContainer: { padding: 15, flexGrow: 1 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginTop: 15 },
    emptySubtext: { fontSize: 15, color: theme.textSecondary, marginTop: 5, textAlign: 'center', maxWidth: '80%' },
    card: { backgroundColor: theme.surface, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
    colorBar: { height: 6, width: '100%' },
    cardContent: { padding: 15 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    cardIcon: { marginRight: 10, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    planName: { flex: 1, fontSize: 18, fontWeight: 'bold', color: theme.text },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { color: theme.textOnPrimary, fontSize: 12, fontWeight: 'bold' },
    planPrice: { fontSize: 22, fontWeight: '800', marginBottom: 15 },
    featuresContainer: { marginBottom: 15, borderLeftWidth: 2, borderLeftColor: theme.border, paddingLeft: 12, marginLeft: 4 },
    featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    featureText: { color: theme.textSecondary, fontSize: 14, marginLeft: 8 },
    noteText: { fontSize: 13, fontStyle: 'italic', color: theme.textSecondary, marginBottom: 15, backgroundColor: theme.background, padding: 8, borderRadius: 6 },
    cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, gap: 6 },
    editButton: { backgroundColor: theme.primary },
    deleteButton: { backgroundColor: theme.danger },
    buttonText: { color: theme.textOnPrimary, fontWeight: 'bold' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { height: '85%', backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text },
    label: { fontSize: 16, color: theme.textSecondary, marginBottom: 8, marginTop: 10 },
    input: { width: '100%', height: 50, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 15, color: theme.text, fontSize: 16 },
    inputMulti: { minHeight: 120, textAlignVertical: 'top', paddingTop: 15, width: '100%', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 15, color: theme.text, fontSize: 16 },
    row: { flexDirection: 'row', gap: 15 },
    halfInput: { flex: 1 },
    selectorIconPreview: {marginRight: 15,},
    switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 20, paddingVertical: 10, backgroundColor: theme.background, borderRadius: 10, paddingHorizontal: 15 },
    switchLabel: { fontSize: 16, fontWeight: '500', color: theme.text },
    modalButtonContainer: { paddingTop: 15, paddingBottom: 10, borderTopWidth: 1, borderTopColor: theme.border },
    saveButton: { backgroundColor: theme.primary, justifyContent: 'center' },
    customSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 15, height: 50, },
    selectorLabel: { color: theme.text, fontSize: 16, flex: 1, },
    selectorIcon: { marginLeft: 10, },
    colorSwatch: { width: 20, height: 20, borderRadius: 5, marginRight: 15, borderWidth: 1, borderColor: theme.border, },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', },
    pickerContainer: { width: '90%', maxHeight: '80%', backgroundColor: theme.surface, borderRadius: 15, padding: 20, alignItems: 'center', },
    pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingTop: 10, },
    colorOption: { alignItems: 'center', margin: 10, width: 80, },
    iconOption: { alignItems: 'center', margin: 10, width: 80, },
    colorSwatchLarge: { width: 50, height: 50, borderRadius: 10, borderWidth: 2, borderColor: theme.border, marginBottom: 8, },
    pickerOptionText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', },
    closeText: { marginTop: 20, paddingVertical: 10, color: theme.primary, fontWeight: 'bold', fontSize: 16, },
});