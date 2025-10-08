// screens/BillDetailScreen.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Image, TouchableOpacity, Modal, Switch, TextInput, RefreshControl } from 'react-native';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getStatusDetails = (status, theme) => {
    switch (status) {
        case 'Paid': return { color: theme.success, label: 'Paid', icon: 'checkmark-circle' };
        case 'Pending Verification': return { color: '#8E44AD', label: 'Pending Verification', icon: 'hourglass' };
        case 'Overdue': return { color: theme.danger, label: 'Overdue', icon: 'alert-circle' };
        case 'Due': return { color: '#F39C12', label: 'Due', icon: 'information-circle' };
        case 'Upcoming': return { color: theme.info, label: 'Upcoming', icon: 'calendar' };
        case 'Voided': return { color: '#ecececff', label: 'Voided', icon: 'close-circle' };
        default: return { color: '#acacacff', label: status, icon: 'help-circle' };
    }
};

export default function BillDetailScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const route = useRoute();
    const navigation = useNavigation();
    const { showAlert } = useAlert();
    const { billId } = route.params;
    
    const [bill, setBill] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setActionLoading] = useState(false);
    const [isDisapproveModalVisible, setDisapproveModalVisible] = useState(false);
    const [disapproveReason, setDisapproveReason] = useState('');
    const [isCorrectModalVisible, setCorrectModalVisible] = useState(false);
    const [correctionAmount, setCorrectionAmount] = useState('');
    const [correctionReason, setCorrectionReason] = useState('');
    const [isRecordPaymentModalVisible, setRecordPaymentModalVisible] = useState(false);
    const [recordedAmount, setRecordedAmount] = useState('');
    const [recordedNotes, setRecordedNotes] = useState('');
    const [carryOver, setCarryOver] = useState(false);
    
    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setIsLoading(true);
        try {
            const { data } = await api.get(`/admin/bills/${billId}`);
            setBill(data);
            navigation.setOptions({ title: `Bill #${data._id.slice(-6)}` });
        } catch (error) {
            showAlert("Error", "Could not fetch bill details.");
            navigation.goBack();
        } finally {
            if (isInitialLoad) setIsLoading(false);
        }
    }, [billId, navigation, showAlert]);

    useFocusEffect(
        useCallback(() => {
            fetchData(true);
        }, [fetchData])
    );

    const handleApprovePayment = () => {
        showAlert("Confirm Approval", "This will mark the bill as paid...", [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", style: "destructive", onPress: async () => {
                setActionLoading(true);
                try {
                    await api.post(`/admin/bills/${billId}/mark-paid`);
                    showAlert("Success", "Payment approved successfully!");
                    await fetchData(true);
                } catch (error) {
                    showAlert("Error", error.response?.data?.message || "Failed to approve payment.");
                } finally {
                    setActionLoading(false);
                }
            }}
        ]);
    };

    const handleDisapprovePayment = async () => {
        if (!disapproveReason.trim()) return showAlert("Validation Error", "A reason for disapproval is required.");
        setActionLoading(true);
        setDisapproveModalVisible(false);
        try {
            await api.post(`/admin/bills/${billId}/disapprove`, { reason: disapproveReason });
            showAlert("Success", "Payment has been disapproved and the user notified.");
            setDisapproveReason('');
            await fetchData(true);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to disapprove payment.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleCorrectBill = async () => {
        const newAmount = parseFloat(correctionAmount);
        if (isNaN(newAmount) || newAmount <= 0) return showAlert("Validation Error", "Please enter a valid new amount.");
        if (!correctionReason.trim()) return showAlert("Validation Error", "A reason for the correction is required.");

        setActionLoading(true);
        setCorrectModalVisible(false);
        try {
            await api.put(`/admin/bills/${billId}/correct`, {
                newAmount: newAmount,
                reason: correctionReason,
            });
            showAlert("Success", "Bill corrected successfully. The original bill has been voided.");
            setCorrectionAmount('');
            setCorrectionReason('');
            await fetchData(true);
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to correct the bill.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRecordPartialPayment = async () => {
        const amount = parseFloat(recordedAmount);
        if (isNaN(amount) || amount <= 0) return showAlert("Validation Error", "Please enter a valid amount.");
        
        setActionLoading(true);
        setRecordPaymentModalVisible(false);
        try {
            await api.post(`/admin/bills/${billId}/record-partial-payment`, {
                amountPaid: amount,
                notes: recordedNotes,
                carryOverToNextMonth: carryOver,
            });
            
            showAlert("Success", "Partial payment recorded successfully.");
            setRecordedAmount('');
            setRecordedNotes('');
            setCarryOver(false);
            navigation.goBack(); 
        } catch (error) {
            showAlert("Error", error.response?.data?.message || "Failed to record payment.");
        } finally {
            setActionLoading(false);
        }
    };
    
    if (isLoading) return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    if (!bill) return <View style={styles.centered}><Text>Bill not found.</Text></View>;

    const status = getStatusDetails(bill.status, theme);
    const isPayable = ['Due', 'Overdue'].includes(bill.status);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchData(true)} />}>
                <View style={[styles.statusBanner, { backgroundColor: status.color }]}>
                    <Ionicons name={status.icon} size={32} color="blue" />
                    <View style={{ marginLeft: 15 }}>
                        <Text style={styles.statusBannerText}>{status.label.toUpperCase()}</Text>
                        <Text style={styles.statusBannerAmount}>₱{bill.amount.toFixed(2)}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>BILLED TO</Text>
                    <View style={styles.detailRow}><Ionicons name="person-outline" size={20} color={theme.textSecondary} /><Text style={styles.detailValue}>{bill.userId?.displayName || 'N/A'}</Text></View>
                     <View style={styles.detailRow}><Ionicons name="mail-outline" size={20} color={theme.textSecondary} /><Text style={styles.detailValue}>{bill.userId?.email || 'N/A'}</Text></View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>DETAILS</Text>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Statement Date</Text><Text style={styles.detailValue}>{formatDate(bill.statementDate)}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Due Date</Text><Text style={styles.detailValue}>{formatDate(bill.dueDate)}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Payment Date</Text><Text style={styles.detailValue}>{formatDate(bill.paymentDate)}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Invoice Number</Text><Text style={styles.detailValue}>{bill._id.toString().slice(-8).toUpperCase()}</Text></View>
                    {bill.notes && <>
                        <View style={styles.separator} />
                        <Text style={styles.notesTitle}>Notes</Text>
                        <Text style={styles.notesText}>{bill.notes}</Text>
                    </>}
                </View>

                {bill.proofOfPayment && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Proof of Payment</Text>
                        <Image source={{ uri: bill.proofOfPayment }} style={styles.proofImage} resizeMode="contain" />
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                {bill.status === 'Pending Verification' && (
                    <>
                        <TouchableOpacity style={[styles.button, styles.disapproveButton]} onPress={() => setDisapproveModalVisible(true)}><Text style={styles.disapproveButtonText}>Disapprove</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={handleApprovePayment}><Text style={styles.approveButtonText}>Approve</Text></TouchableOpacity>
                    </>
                )}
                {isPayable && (
                    <>
                        <TouchableOpacity style={[styles.button, styles.correctButton]} onPress={() => setRecordPaymentModalVisible(true)}>
                             <Ionicons name="cash-outline" size={20} color={theme.primary} />
                            <Text style={styles.correctButtonText}>Record Partial</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={handleApprovePayment}>
                            <Ionicons name="checkmark" size={20} color={"white"} />
                            <Text style={styles.approveButtonText}>Mark as Paid</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            <Modal visible={isDisapproveModalVisible} transparent={true} animationType="fade" onRequestClose={() => setDisapproveModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Disapprove Reason</Text>
                        <TextInput style={styles.modalInput} placeholder="Reason for disapproval..." value={disapproveReason} onChangeText={setDisapproveReason} multiline />
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.modalButton} onPress={() => setDisapproveModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.danger }]} onPress={handleDisapprovePayment}><Text style={{ color: 'white' }}>Submit</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            <Modal visible={isCorrectModalVisible} transparent={true} animationType="fade" onRequestClose={() => setCorrectModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Correct Bill</Text>
                        <TextInput style={styles.modalInput} placeholder="Enter new amount" value={correctionAmount} onChangeText={setCorrectionAmount} keyboardType="numeric" />
                        <TextInput style={styles.modalInput} placeholder="Reason for correction..." value={correctionReason} onChangeText={setCorrectionReason} multiline />
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.modalButton} onPress={() => setCorrectModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={handleCorrectBill}><Text style={{ color: 'white' }}>Submit Correction</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={isRecordPaymentModalVisible} transparent={true} animationType="fade" onRequestClose={() => setRecordPaymentModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Record Partial Payment</Text>
                        <TextInput style={styles.modalInput} placeholder="Enter exact amount paid..." value={recordedAmount} onChangeText={setRecordedAmount} keyboardType="numeric" />
                        <TextInput style={styles.modalInput} placeholder="Notes (e.g., receipt number)..." value={recordedNotes} onChangeText={setRecordedNotes} multiline />
                        <View style={styles.carryOverContainer}>
                            <Text style={styles.carryOverLabel}>Carry remaining balance to next month's bill?</Text>
                            <Switch
                                trackColor={{ false: "#767577", true: theme.primary }}
                                thumbColor={carryOver ? "#f4f3f4" : "#f4f3f4"}
                                onValueChange={() => setCarryOver(previousState => !previousState)}
                                value={carryOver}
                            />
                        </View>
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity style={styles.modalButton} onPress={() => setRecordPaymentModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.success }]} onPress={handleRecordPartialPayment}><Text style={{ color: 'white' }}>Submit</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            
            {isActionLoading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={theme.primary} /></View>}
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    scrollContainer: { padding: 16, paddingBottom: 100 },
    statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 12, marginBottom: 16 },
    statusBannerText: { color: theme.textSecondary, fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
    statusBannerAmount: { color: theme.text, fontSize: 28, fontWeight: 'bold' },
    card: { backgroundColor: theme.surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 12, letterSpacing: 0.5 },
    detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    detailLabel: { fontSize: 15, color: theme.textSecondary, flex: 1 },
    detailValue: { fontSize: 15, color: theme.text, fontWeight: '500', marginLeft: 12, flexShrink: 1 },
    separator: { height: 1, backgroundColor: theme.border, marginVertical: 12 },
    notesTitle: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 4 },
    notesText: { fontSize: 15, color: theme.textSecondary, lineHeight: 22 },
    proofImage: { width: '100%', height: 300, borderRadius: 8, backgroundColor: '#f0f0f0' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: 16, paddingBottom: 32, backgroundColor: theme.surface, borderTopWidth: 1, borderColor: theme.border, gap: 16 },
    button: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    disapproveButton: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: theme.danger },
    disapproveButtonText: { color: theme.danger, fontSize: 16, fontWeight: 'bold' },
    approveButton: { backgroundColor: theme.success },
    approveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    correctButton: { backgroundColor: '#E0E7FF', borderWidth: 1, borderColor: theme.primary },
    correctButtonText: { color: theme.primary, fontSize: 16, fontWeight: 'bold' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '90%', backgroundColor: theme.surface, borderRadius: 12, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: theme.text },
    modalInput: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, minHeight: 50, textAlignVertical: 'top', marginBottom: 16, color: theme.text, fontSize: 16 },
    modalButtonContainer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.border },
});