import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TextInput, TouchableOpacity, Keyboard, RefreshControl, Modal, Switch, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '../../contexts/AlertContext';

// --- Reusable Components (No Changes) ---
const StatCard = ({ title, value, color, icon, theme }) => {
    const styles = getStyles(theme);
    const backgroundColor = color + '20';
    return (
        <View style={[styles.statCard, { backgroundColor }]}>
            <View style={styles.statIconContainer}><Ionicons name={icon} size={22} color={color} /></View>
            <Text style={styles.statCardValue}>{value}</Text>
            <Text style={styles.statCardTitle}>{title}</Text>
        </View>
    );
};

const JobOrderCard = ({ item, theme, navigation, onAssignPress, onArchivePress, onDeletePress }) => {
    const styles = getStyles(theme);
    const statusStyles = {
        'Pending Assignment': { backgroundColor: '#FEF3C7', color: '#B45309', icon: 'person-add-outline' },
        'Pending Acceptance': { backgroundColor: '#FEF9C3', color: '#854D0E', icon: 'help-circle-outline' },
        'Assigned': { backgroundColor: '#E0E7FF', color: '#4338CA', icon: 'person-circle-outline' },
        'In Progress': { backgroundColor: '#DBEAFE', color: '#1D4ED8', icon: 'construct-outline' },
        'On Hold': { backgroundColor: '#F3E8FF', color: '#5B21B6', icon: 'pause-circle-outline' },
        'Completed': { backgroundColor: '#D1FAE5', color: '#065F46', icon: 'checkmark-done-circle-outline' },
        'Over Due': { backgroundColor: '#FEE2E2', color: '#B91C1C', icon: 'alert-circle-outline' },
    };
    const status = statusStyles[item.status] || { backgroundColor: theme.border, color: theme.textSecondary, icon: 'help-circle-outline' };
    const customerName = item.userId ? item.userId.displayName : (item.customerDetails?.name || 'N/A');
    const isAssignDisabled = item.status !== 'Pending Assignment';

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
            <View style={styles.cardInfoRow}><Ionicons name="build-outline" size={16} color={theme.textSecondary} /><Text style={styles.cardInfoText}>Type: {item.type}</Text></View>
            <View style={styles.cardInfoRow}><Ionicons name="person-circle-outline" size={16} color={theme.textSecondary} /><Text style={styles.cardInfoText}>Assigned: {item.assignedTo?.displayName || 'Unassigned'}</Text></View>
            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => navigation.navigate('JobOrderDetail', { jobId: item._id })}><Text style={styles.actionButtonSecondaryText}>View</Text></TouchableOpacity>
                {item.status === 'Completed' ? (
                    <TouchableOpacity style={styles.actionButtonArchive} onPress={() => onArchivePress(item._id)}><Ionicons name="archive-outline" size={18} color={theme.textSecondary} /><Text style={styles.actionButtonArchiveText}>Archive</Text></TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity style={styles.actionButtonDelete} onPress={() => onDeletePress(item._id)}><Ionicons name="trash-outline" size={18} color={theme.danger} /></TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButtonPrimary, isAssignDisabled && styles.disabledInput]} onPress={() => onAssignPress(item._id)} disabled={isAssignDisabled}><Ionicons name="person-add-outline" size={18} color="#FFFFFF" /><Text style={styles.actionButtonPrimaryText}>Assign</Text></TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
};

// --- Main Dashboard Screen ---
export default function AdminJobOrdersScreen({ navigation }) {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();
    
    // --- STATE MANAGEMENT ---
    const [stats, setStats] = useState({ active: 0, pending: 0, completed: 0, overdue: 0 });
    const [masterJobOrders, setMasterJobOrders] = useState([]);
    const [filteredJobOrders, setFilteredJobOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('All Types');
    const [selectedTab, setSelectedTab] = useState('Active'); // <-- NEW: State for tabs
    
    // Modals Visibility
    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [isCustomerModalVisible, setCustomerModalVisible] = useState(false);
    const [isFilterModalVisible, setFilterModalVisible] = useState(false);
    const [assignState, setAssignState] = useState({ isVisible: false, jobId: null, autoAssign: true, selectedAgent: null });
    const [agentList, setAgentList] = useState([]);
    const [isAgentsLoading, setIsAgentsLoading] = useState(false);
    const initialJobState = { type: '', description: '', customer: null, isWalkIn: false, walkInName: '', walkInContact: '', autoAssign: true, selectedAgent: null };
    const [newJobData, setNewJobData] = useState(initialJobState);
    const [customerList, setCustomerList] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [isJobTypeDropdownVisible, setJobTypeDropdownVisible] = useState(false);
    const [isAgentDropdownVisible, setAgentDropdownVisible] = useState(false);
    
    // Constants
    const JOB_TYPES = useMemo(() => ['All Types', 'Installation', 'Repair', 'Maintenance', 'Upgrade', 'Disconnection', 'Retrieval'], []);
    const NEW_JOB_TYPES = useMemo(() => JOB_TYPES.filter(t => t !== 'All Types'), [JOB_TYPES]);

    // --- DATA FETCHING & FILTERING ---
    const fetchData = useCallback(async (isRefreshing = false) => {
        if (!isRefreshing) setIsLoading(true);
        try {
            const { data } = await api.get('/admin/job-orders');
            setStats({
                active: data.filter(j => j.status !== 'Completed' && j.status !== 'Archived').length,
                pending: data.filter(j => j.status === 'Pending Assignment').length,
                completed: data.filter(j => j.status === 'Completed').length,
                overdue: data.filter(j => j.status === 'Over Due').length,
            });
            setMasterJobOrders(data);
        } catch (error) {
             showAlert("Error", "Could not fetch job orders.");
        } finally { 
            setIsLoading(false); 
        }
    }, [showAlert]);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

    // [MODIFIED] Filter logic now includes the selected tab
    useEffect(() => {
        let jobs = [...masterJobOrders];

        // 1. Filter by the selected tab first
        if (selectedTab === 'Active') {
            jobs = jobs.filter(job => job.status !== 'Completed');
            jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else { // 'Completed' tab
            jobs = jobs.filter(job => job.status === 'Completed');
            jobs.sort((a, b) => new Date(b.completionDate) - new Date(a.completionDate));
        }

        // 2. Then, apply the search query
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            jobs = jobs.filter(job =>
                (job.userId?.displayName || job.customerDetails?.name || '').toLowerCase().includes(lowercasedQuery) ||
                (job.jobId || '').toLowerCase().includes(lowercasedQuery) ||
                (job._id || '').toLowerCase().includes(lowercasedQuery.replace('jo-', ''))
            );
        }
        // 3. Finally, apply the type filter
        if (selectedTypeFilter !== 'All Types') {
            jobs = jobs.filter(job => job.type === selectedTypeFilter);
        }
        setFilteredJobOrders(jobs);
    }, [searchQuery, selectedTypeFilter, masterJobOrders, selectedTab]); // <-- NEW: Added selectedTab dependency

    // --- HANDLERS (No Change) ---
    const handleOpenAddModal = async () => {
        setNewJobData(initialJobState); 
        setCustomerSearch('');
        setJobTypeDropdownVisible(false);
        setAgentDropdownVisible(false);
        setAddModalVisible(true);
        setIsAgentsLoading(true);
        try {
            const [customersRes, agentsRes] = await Promise.all([
                api.get('/admin/subscribers/list'),
                api.get('/admin/field-agents')
            ]);
            setCustomerList(customersRes.data);
            setAgentList(agentsRes.data);
        } catch (error) {
            showAlert("Error", "Could not fetch necessary data for creating a job.");
            setAddModalVisible(false);
        } finally {
            setIsAgentsLoading(false);
        }
    };

    const isFormValid = useMemo(() => {
        const { type, description, isWalkIn, walkInName, customer, autoAssign, selectedAgent } = newJobData;
        if (!type || !description) return false;
        const hasCustomer = isWalkIn ? !!walkInName : !!customer;
        if (!hasCustomer) return false;
        const hasAgent = autoAssign || !!selectedAgent;
        return hasAgent;
    }, [newJobData]);

    const handleCreateAndAssignJob = async () => {
        if (!isFormValid) {
            return showAlert("Missing Information", "Please fill out all required fields.");
        }
        setIsSubmitting(true);
        const { type, description, customer, isWalkIn, walkInName, walkInContact, autoAssign, selectedAgent } = newJobData;
        const payload = {
            type, description, autoAssign,
            agentId: !autoAssign ? selectedAgent?._id : null,
            customerDetails: isWalkIn ? { name: walkInName, contact: walkInContact } : null,
            userId: !isWalkIn ? customer?._id : null,
        };
        try {
            const { data } = await api.post('/admin/job-orders', payload);
            showAlert("Success", data.message || "Job order created successfully.");
            setAddModalVisible(false);
            await fetchData(true); 
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to create job.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleOpenAssignModal = async (jobId) => {
        setAssignState({ isVisible: true, jobId, autoAssign: true, selectedAgent: null });
        setAgentDropdownVisible(false);
        setIsAgentsLoading(true);
        try {
            const { data } = await api.get('/admin/field-agents');
            setAgentList(data);
        } catch (error) {
            showAlert("Error", "Could not fetch technicians.");
            setAssignState(prev => ({ ...prev, isVisible: false }));
        } finally {
            setIsAgentsLoading(false);
        }
    };

    const handleConfirmAssignment = async () => {
        const { jobId, autoAssign, selectedAgent } = assignState;
        if (!autoAssign && !selectedAgent) {
            return showAlert("Selection Required", "Please select a technician or use auto-assign.");
        }
        setIsSubmitting(true);
        try {
            const url = autoAssign ? `/admin/job-orders/${jobId}/auto-assign` : `/admin/job-orders/${jobId}/assign`;
            const payload = autoAssign ? {} : { agentId: selectedAgent._id };
            const { data } = await api.put(url, payload);
            showAlert("Success", data.message);
            setAssignState({ isVisible: false, jobId: null, autoAssign: true, selectedAgent: null });
            await fetchData(true);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Assignment failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (jobId) => {
        showAlert("Confirm Delete", "Are you sure you want to permanently delete this job?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                try {
                    await api.delete(`/admin/job-orders/${jobId}`);
                    showAlert("Success", "Job has been deleted.");
                    await fetchData(true); 
                } catch (error) { showAlert("Error", "Failed to delete job."); }
            }}
        ]);
    };

    const handleArchive = (jobId) => {
        showAlert("Confirm Archive", "Are you sure you want to archive this job?", [
            { text: "Cancel", style: "cancel" },
            { text: "Archive", style: "destructive", onPress: async () => {
                try {
                    await api.post(`/admin/job-orders/${jobId}/archive`);
                    showAlert("Success", "Job has been archived.");
                    await fetchData(true);
                } catch (error) { showAlert("Error", "Failed to archive job."); }
            }}
        ]);
    };

    const filteredCustomers = useMemo(() => 
        customerList.filter(c => c.displayName.toLowerCase().includes(customerSearch.toLowerCase())),
    [customerList, customerSearch]);
    
    const renderAgentItem = (agent, onPress) => {
        const totalJobs = (agent.pendingJobs || 0) + (agent.inProgressJobs || 0);
        let workloadStyle = styles.workloadAvailable;
        let workloadText = 'Available';
        if (totalJobs > 0 && totalJobs <= 2) {
            workloadStyle = styles.workloadModerate;
            workloadText = `${totalJobs} Active Job${totalJobs > 1 ? 's' : ''}`;
        } else if (totalJobs > 2) {
            workloadStyle = styles.workloadBusy;
            workloadText = `${totalJobs} Active Jobs`;
        }
        return (
            <TouchableOpacity key={agent._id} style={styles.dropdownItem} onPress={onPress}>
                <View>
                    <Text style={styles.dropdownItemText}>{agent.displayName}</Text>
                    {totalJobs > 0 && (<Text style={styles.workloadBreakdownText}>Pending: {agent.pendingJobs || 0}, In Progress: {agent.inProgressJobs || 0}</Text>)}
                </View>
                <View style={[styles.workloadBadge, workloadStyle.badge]}><Text style={[styles.workloadText, workloadStyle.text]}>{workloadText}</Text></View>
            </TouchableOpacity>
        );
    };

    // --- RENDER ---
    return (
        <SafeAreaView style={styles.safeArea}>
            <FlatList
                ListHeaderComponent={
                    <View style={styles.listHeaderContainer}>
                        <View style={styles.statsContainer}><StatCard title="Active Jobs" value={stats.active} color="#3B82F6" icon="file-tray-stacked-outline" theme={theme}/><StatCard title="Pending" value={stats.pending} color="#FBBF24" icon="hourglass-outline" theme={theme}/><StatCard title="Completed" value={stats.completed} color="#10B981" icon="checkmark-done-outline" theme={theme}/><StatCard title="Overdue" value={stats.overdue} color="#EF4444" icon="alert-circle-outline" theme={theme}/></View>
                        <View style={styles.toolbar}><View style={styles.searchRow}><View style={styles.searchInputContainer}><Ionicons name="search" size={20} color={theme.textSecondary} /><TextInput style={styles.searchInput} placeholder="Search by name, ID..." value={searchQuery} onChangeText={setSearchQuery} /></View><TouchableOpacity style={styles.iconButton} onPress={() => setFilterModalVisible(true)}><Ionicons name="filter" size={24} color={theme.primary} /></TouchableOpacity></View><View style={styles.buttonsRow}><TouchableOpacity style={styles.toolbarButton} onPress={() => navigation.navigate('AdminArchivedJobs')}><Ionicons name="archive-outline" size={22} color={theme.textSecondary} /><Text style={styles.toolbarButtonText}>Archive</Text></TouchableOpacity><TouchableOpacity style={styles.createButton} onPress={handleOpenAddModal}><Ionicons name="add" size={20} color="#FFFFFF" /><Text style={styles.createButtonText}>New Job Order</Text></TouchableOpacity></View></View>
                        
                        {/* --- NEW: TAB SELECTOR --- */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity style={[styles.tab, selectedTab === 'Active' && styles.activeTab]} onPress={() => setSelectedTab('Active')}>
                                <Text style={[styles.tabText, selectedTab === 'Active' && styles.activeTabText]}>Active Jobs</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tab, selectedTab === 'Completed' && styles.activeTab]} onPress={() => setSelectedTab('Completed')}>
                                <Text style={[styles.tabText, selectedTab === 'Completed' && styles.activeTabText]}>Completed</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                data={filteredJobOrders}
                renderItem={({item}) => <JobOrderCard item={item} theme={theme} navigation={navigation} onAssignPress={handleOpenAssignModal} onArchivePress={handleArchive} onDeletePress={handleDelete} />}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContentContainer}
                ListEmptyComponent={
                    !isLoading && 
                    <View style={styles.emptyContainer}>
                        <Ionicons name="file-tray-outline" size={60} color={theme.border} />
                        {/* --- NEW: DYNAMIC EMPTY MESSAGE --- */}
                        <Text style={styles.emptyText}>
                            {selectedTab === 'Active' ? 'No active jobs found.' : 'No completed jobs found.'}
                        </Text>
                    </View>
                }
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchData(true)} tintColor={theme.primary} />}
            />

            <Modal animationType="fade" transparent={true} visible={isFilterModalVisible} onRequestClose={() => setFilterModalVisible(false)}><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setFilterModalVisible(false)}><TouchableOpacity activeOpacity={1} style={styles.modalView}><Text style={styles.modalTitle}>Filter by Type</Text>{JOB_TYPES.map(type => (<TouchableOpacity key={type} style={styles.filterItem} onPress={() => { setSelectedTypeFilter(type); setFilterModalVisible(false); }}><Text style={[styles.filterItemText, selectedTypeFilter === type && styles.filterItemTextSelected]}>{type}</Text>{selectedTypeFilter === type && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}</TouchableOpacity>))}</TouchableOpacity></TouchableOpacity></Modal>
            
            <Modal animationType="fade" transparent={true} visible={assignState.isVisible} onRequestClose={() => setAssignState(prev => ({...prev, isVisible: false}))}><TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setAssignState(prev => ({...prev, isVisible: false}))}><TouchableOpacity activeOpacity={1} style={styles.modalView}><Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 10 }}>Assign Technician</Text><View style={styles.toggleContainer}><Text style={styles.label}>Auto Assign (Finds a free agent)</Text><Switch value={assignState.autoAssign} onValueChange={(value) => setAssignState(prev => ({...prev, autoAssign: value, selectedAgent: null}))} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={"#ffffff"}/></View><Text style={styles.label}>Manual Assignment</Text><TouchableOpacity style={[styles.inputSelector, assignState.autoAssign && styles.disabledInput]} onPress={() => { if (!assignState.autoAssign) setAgentDropdownVisible(!isAgentDropdownVisible)}} disabled={assignState.autoAssign}><Text style={[styles.selectorText, !assignState.selectedAgent && {color: theme.placeholder}]}>{assignState.selectedAgent?.displayName || 'Select Technician'}</Text><Ionicons name="chevron-down" size={20} color={theme.textSecondary} /></TouchableOpacity>{isAgentDropdownVisible && (<View style={styles.formDropdownContainer}><ScrollView nestedScrollEnabled={true}>{isAgentsLoading ? <ActivityIndicator/> : agentList.map(agent => renderAgentItem(agent, () => { setAssignState(prev => ({...prev, selectedAgent: agent})); setAgentDropdownVisible(false); }))}</ScrollView></View>)}<View style={styles.modalActions}><TouchableOpacity style={[styles.modalConfirmButton, isSubmitting && styles.disabledInput]} onPress={handleConfirmAssignment} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonText}>Confirm Assignment</Text>}</TouchableOpacity></View></TouchableOpacity></TouchableOpacity></Modal>
                
            <Modal animationType="fade" transparent={true} visible={isAddModalVisible} onRequestClose={() => setAddModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setAddModalVisible(false)} />
                    <TouchableOpacity activeOpacity={1} style={styles.centeredModalView}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Create Job Order</Text><TouchableOpacity onPress={() => setAddModalVisible(false)}><Ionicons name="close-circle" size={28} color={theme.textOnPrimary} /></TouchableOpacity></View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScrollView}>
                            <Text style={styles.label}>Job Type*</Text>
                            <TouchableOpacity style={styles.inputSelector} onPress={() => { setJobTypeDropdownVisible(!isJobTypeDropdownVisible); Keyboard.dismiss(); }}><Text style={[styles.selectorText, !newJobData.type && {color: theme.placeholder}]}>{newJobData.type || 'Select a job type'}</Text><Ionicons name="chevron-down" size={20} color={theme.textSecondary} /></TouchableOpacity>
                            {isJobTypeDropdownVisible && (<View style={styles.formDropdownContainer}><ScrollView nestedScrollEnabled={true}>{NEW_JOB_TYPES.map(type => (<TouchableOpacity key={type} style={styles.dropdownItem} onPress={() => { setNewJobData(prev => ({...prev, type})); setJobTypeDropdownVisible(false); }}><Text style={styles.dropdownItemText}>{type}</Text></TouchableOpacity>))}</ScrollView></View>)}
                            <View style={styles.toggleContainer}><Text style={styles.label}>Walk-in Customer</Text><Switch value={newJobData.isWalkIn} onValueChange={(value) => setNewJobData(prev => ({...prev, isWalkIn: value, customer: null}))} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={"#ffffff"}/></View>
                            {newJobData.isWalkIn ? (<><Text style={styles.label}>Customer Name*</Text><TextInput style={styles.input} placeholder="Enter full name" value={newJobData.walkInName} onChangeText={text => setNewJobData(prev => ({...prev, walkInName: text}))} /><Text style={styles.label}>Contact (Optional)</Text><TextInput style={styles.input} placeholder="Enter phone or email" value={newJobData.walkInContact} onChangeText={text => setNewJobData(prev => ({...prev, walkInContact: text}))} /></>) : (<><Text style={styles.label}>Subscriber*</Text><TouchableOpacity style={styles.inputSelector} onPress={() => setCustomerModalVisible(true)}><Text style={[styles.selectorText, !newJobData.customer && {color: theme.placeholder}]}>{newJobData.customer?.displayName || 'Select a subscriber'}</Text><Ionicons name="search-outline" size={20} color={theme.textSecondary} /></TouchableOpacity></>)}
                            <Text style={styles.label}>Description*</Text>
                            <TextInput style={[styles.input, styles.textArea]} placeholder="Add job details, address, reported issues..." multiline value={newJobData.description} onChangeText={text => setNewJobData(prev => ({...prev, description: text}))} />
                            <View style={styles.divider} />
                            <Text style={styles.modalSectionTitle}>Assign Technician</Text>
                            <View style={styles.toggleContainer}><Text style={styles.label}>Auto Assign Technician</Text><Switch value={newJobData.autoAssign} onValueChange={(value) => setNewJobData(prev => ({...prev, autoAssign: value, selectedAgent: null}))} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={"#ffffff"}/></View>
                            <TouchableOpacity style={[styles.inputSelector, newJobData.autoAssign && styles.disabledInput]} onPress={() => { if (!newJobData.autoAssign) setAgentDropdownVisible(!isAgentDropdownVisible)}} disabled={newJobData.autoAssign}><Text style={[styles.selectorText, !newJobData.selectedAgent && {color: theme.placeholder}]}>{newJobData.selectedAgent?.displayName || 'Select Technician'}</Text><Ionicons name="chevron-down" size={20} color={theme.textSecondary} /></TouchableOpacity>
                            {isAgentDropdownVisible && (<View style={styles.formDropdownContainer}><ScrollView nestedScrollEnabled={true}>{isAgentsLoading ? <ActivityIndicator style={{marginVertical: 10}}/> : agentList.map(agent => renderAgentItem(agent, () => { setNewJobData(prev => ({...prev, selectedAgent: agent})); setAgentDropdownVisible(false); }))}</ScrollView></View>)}
                            <View style={styles.modalActions}><TouchableOpacity style={[styles.modalConfirmButton, (!isFormValid || isSubmitting) && styles.disabledInput]} onPress={handleCreateAndAssignJob} disabled={!isFormValid || isSubmitting}>{isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalButtonText}>Create Job</Text>}</TouchableOpacity></View>
                        </ScrollView>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>
            
            <Modal animationType="slide" visible={isCustomerModalVisible} onRequestClose={() => setCustomerModalVisible(false)}><SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}><View style={styles.customerModalContainer}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Select Subscriber</Text><TouchableOpacity onPress={() => setCustomerModalVisible(false)}><Ionicons name="close-circle" size={28} color={theme.textSecondary} /></TouchableOpacity></View><View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border}}><Ionicons name="search" size={20} color={theme.textSecondary} /><TextInput style={styles.searchInput} placeholder="Search subscribers..." value={customerSearch} onChangeText={setCustomerSearch} /></View><FlatList data={filteredCustomers} keyExtractor={(item) => item._id} renderItem={({item}) => (<TouchableOpacity style={styles.customerItem} onPress={() => { setNewJobData(prev => ({...prev, customer: item})); setCustomerModalVisible(false); }}><View><Text style={styles.customerName}>{item.displayName}</Text><Text style={styles.customerEmail}>{item.email}</Text></View><Ionicons name="chevron-forward" size={24} color={theme.textSecondary} /></TouchableOpacity>)} ListEmptyComponent={<Text style={styles.emptyTextSmall}>No subscribers found.</Text>}/></View></SafeAreaView></Modal>
        </SafeAreaView>
    );
}

// --- Styles ---
const getStyles = (theme) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    listHeaderContainer: { paddingHorizontal: 16, paddingTop: 10 },
    listContentContainer: { paddingBottom: 24, paddingHorizontal: 16 },
    statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statCard: { width: '48.5%', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
    statIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statCardValue: { color: theme.text, fontSize: 26, fontWeight: 'bold' },
    statCardTitle: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
    toolbar: { marginVertical: 10, gap: 12 },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border },
    searchInput: { flex: 1, height: 48, marginLeft: 8, color: theme.text, fontSize: 16 },
    iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
    buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    toolbarButton: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderRadius: 10, height: 48, borderWidth: 1, borderColor: theme.border },
    toolbarButtonText: { color: theme.textSecondary, fontWeight: '600' },
    createButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, borderRadius: 10, height: 48, elevation: 2, shadowColor: theme.primary },
    createButtonText: { color: '#FFFFFF', fontWeight: 'bold', marginLeft: 8 },
    
    // --- NEW: TAB STYLES ---
    tabContainer: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 10, padding: 4, borderWidth: 1, borderColor: theme.border, marginTop: 10, marginBottom: 10 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    activeTab: { backgroundColor: theme.primary },
    tabText: { color: theme.textSecondary, fontWeight: '600' },
    activeTabText: { color: '#FFFFFF' },

    dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
    dropdownItemText: { fontSize: 16, color: theme.text, fontWeight: '600' },
    workloadBreakdownText: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    workloadBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignItems: 'center', minWidth: 90, justifyContent: 'center' },
    workloadText: { fontSize: 12, fontWeight: 'bold' },
    workloadAvailable: { badge: { backgroundColor: '#D1FAE5' }, text: { color: '#065F46' } },
    workloadModerate: { badge: { backgroundColor: '#FEF3C7' }, text: { color: '#92400E' } },
    workloadBusy: { badge: { backgroundColor: '#FEE2E2' }, text: { color: '#B91C1C' } },
    
    card: { backgroundColor: theme.surface, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    cardJobId: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
    cardCustomerName: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginTop: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusBadgeText: { fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
    cardInfoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
    cardInfoText: { color: theme.text, fontSize: 14, marginLeft: 8 },
    cardActions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, paddingTop: 20, gap: 10 },
    actionButtonSecondary: { paddingHorizontal: 16, height: 40, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.border },
    actionButtonSecondaryText: { color: theme.text, fontWeight: '600' },
    actionButtonPrimary: { paddingHorizontal: 16, height: 40, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: theme.primary },
    actionButtonPrimaryText: { color: '#FFFFFF', fontWeight: '600' },
    actionButtonArchive: { paddingHorizontal: 16, height: 40, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.border },
    actionButtonArchiveText: { color: theme.textSecondary, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
    emptyText: { textAlign: 'center', color: theme.textSecondary, fontSize: 16, marginTop: 10 },
    emptyTextSmall: { textAlign: 'center', color: theme.textSecondary, fontSize: 14, padding: 20 },
    actionButtonDelete: { paddingHorizontal: 16, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.danger, backgroundColor: theme.danger + '1A' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalView: { width: '90%', maxHeight: '60%', backgroundColor: theme.surface, borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    centeredModalView: { width: '90%', maxHeight: '85%', backgroundColor: theme.surface, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },    
    modalHeader: { flexDirection: 'row', backgroundColor: theme.primary, justifyContent: 'space-between', alignItems: 'center', padding: 15, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.textOnPrimary },
    label: { fontSize: 14, color: theme.textSecondary, fontWeight: '600', marginTop: 15, marginBottom: 8 },
    input: { backgroundColor: theme.background, color: theme.text, paddingHorizontal: 15, height: 50, borderRadius: 10, borderWidth: 1, borderColor: theme.border, fontSize: 16 },
    inputSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.background, paddingHorizontal: 15, height: 50, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
    selectorText: { fontSize: 16, color: theme.text },
    textArea: { height: 120, textAlignVertical: 'top', paddingTop: 15 },
    formDropdownContainer: { backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border, marginTop: 4, maxHeight: 200 },
    formScrollView: { paddingHorizontal: 15 },
    modalActions: { paddingTop: 20, paddingBottom: 20 },
    modalConfirmButton: { paddingVertical: 15, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' },
    modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 5 },
    disabledInput: { backgroundColor: theme.border, opacity: 0.7 },
    filterItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: theme.border },
    filterItemText: { fontSize: 16, color: theme.text },
    filterItemTextSelected: { color: theme.primary, fontWeight: 'bold' },
    customerModalContainer: { flex: 1, backgroundColor: theme.background, padding: 15, gap: 10 },
    customerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
    customerName: { fontSize: 16, color: theme.text, fontWeight: '600' },
    customerEmail: { fontSize: 13, color: theme.textSecondary },
    divider: { height: 1, backgroundColor: theme.border, marginVertical: 20 },
    modalSectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 10, textAlign: 'center' },
});