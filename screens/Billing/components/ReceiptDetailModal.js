// admin/components/ReceiptDetailModal.js

import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useTheme } from '../../../contexts/ThemeContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// --- Date formatting functions ---
const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'N/A';
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = true;
    }
    return new Date(dateString).toLocaleDateString('en-US', options);
};

const formatPeriod = (start, end) => {
    if (!start || !end) return 'N/A';
    const startDate = new Date(start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const endDate = new Date(end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `${startDate} - ${endDate}`;
};


const ReceiptDetailModal = ({ isVisible, onClose, receiptData }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    if (!receiptData) return null;

    const handleShareReceipt = async () => {
        try {
            const formattedPaymentDate = formatDate(receiptData.date, true);
            const formattedBillingPeriod = formatPeriod(receiptData.statementDate, receiptData.dueDate);
            const totalAmount = receiptData.amount?.toFixed(2) || '0.00';
            const customerName = receiptData.customerName || 'N/A';

            const htmlContent = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <title>Payment Receipt #${receiptData.receiptNumber}</title>
                        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            html, body {height: 100%; width: 100%; background-color: #f4f7fc; font-family: 'Roboto', sans-serif; color: #333; -webkit-print-color-adjust: exact;}
                            body { display: flex; justify-content: center; align-items: center; padding: 20px 0; overflow: hidden;}
                            .receipt-container { max-width: 450px; width: 80%; background-color: #ffffff; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); overflow: hidden; }
                            .header { background-color: #2c3e50; color: #ffffff; padding: 25px; text-align: center; }
                            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
                            .header p { margin: 5px 0 0; font-size: 14px; color: #bdc3c7; }
                            .receipt-body { padding: 25px; }
                            .success-section { text-align: center; margin-bottom: 25px; }
                            .success-icon { width: 50px; height: 50px; border-radius: 50%; background-color: #2ecc71; display: inline-flex; justify-content: center; align-items: center; margin-bottom: 10px; }
                            .success-icon::after { content: ''; display: block; width: 12px; height: 24px; border: solid #fff; border-width: 0 5px 5px 0; transform: rotate(45deg); }
                            .success-section h2 { font-size: 18px; color: #2c3e50; margin: 0; }
                            .details-section { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
                            .label { color: #7f8c8d; }
                            .value { font-weight: 700; text-align: right; }
                            .separator { border: none; border-top: 1px dashed #cccccc; margin: 20px 0; }
                            .total-section { display: flex; justify-content: space-between; align-items: center; background-color: #2ecc71; color: #ffffff; padding: 15px; border-radius: 10px; margin-top: 10px; }
                            .total-label { font-size: 16px; font-weight: 700; text-transform: uppercase; }
                            .total-value { font-size: 22px; font-weight: 700; }
                            .footer { text-align: center; margin-top: 25px; font-size: 12px; color: #95a5a6; }
                        </style>
                    </head>
                    <body>
                        <div class="receipt-container">
                            <div class="header">
                                <h1>Payment Receipt</h1>
                                <p>FiBear Network Technologies Corp.</p>
                            </div>
                            <div class="receipt-body">
                                <div class="success-section">
                                    <div class="success-icon"></div>
                                    <h2>Payment Confirmed</h2>
                                </div>
                                <div class="details-section">
                                    <span class="label">Receipt No:</span>
                                    <span class="value">${receiptData.receiptNumber || 'N/A'}</span>
                                </div>
                                <div class="details-section">
                                    <span class="label">Payment Date:</span>
                                    <span class="value">${formattedPaymentDate}</span>
                                </div>
                                <div class="details-section">
                                    <span class="label">Customer:</span>
                                    <span class="value">${customerName}</span>
                                </div>
                                <hr class="separator" />
                                <div class="details-section">
                                    <span class="label">Service/Plan:</span>
                                    <span class="value">${receiptData.planName || 'N/A'}</span>
                                </div>
                                <div class="details-section">
                                    <span class="label">Period Covered:</span>
                                    <span class="value">${formattedBillingPeriod}</span>
                                </div>
                                <div class="total-section">
                                    <span class="total-label">Amount Paid</span>
                                    <span class="total-value">₱${totalAmount}</span>
                                </div>
                                <div class="footer">
                                    Thank you for your payment!
                                </div>
                            </div>
                        </div>
                    </body>
                </html>
            `;
            
            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: `Share Receipt ${receiptData.receiptNumber}` });

        } catch (error) {
            console.error("Error sharing receipt:", error);
            Alert.alert('Print/Share Failed', 'An unexpected error occurred while preparing the receipt.');
        }
    };

    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Animatable.View animation="zoomIn" duration={300} style={styles.modalContent}>
                    <Ionicons name="receipt" size={32} color={theme.success} style={styles.modalIcon} />
                    <Text style={styles.modalTitle}>Payment Receipt</Text>
                    
                    <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Receipt No:</Text><Text style={styles.modalDetailValueBold}>{receiptData.receiptNumber}</Text></View>
                    <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Payment Date:</Text><Text style={styles.modalDetailValue}>{formatDate(receiptData.date, true)}</Text></View>
                    {/* --- ✅ FIXED: Added Customer Name to the modal view --- */}
                    <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Billed To:</Text><Text style={styles.modalDetailValue}>{receiptData.customerName}</Text></View>

                    <View style={styles.modalSeparator} />
                    
                    <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Plan:</Text><Text style={styles.modalDetailValue}>{receiptData.planName}</Text></View>
                    {/* --- ✅ FIXED: Now correctly displays the billing period --- */}
                    <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Period Covered:</Text><Text style={styles.modalDetailValue}>{formatPeriod(receiptData.statementDate, receiptData.dueDate)}</Text></View>
                    <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Amount Paid:</Text><Text style={[styles.modalDetailValueBold, { color: theme.success }]}>₱{receiptData.amount?.toFixed(2)}</Text></View>
                    
                    <TouchableOpacity style={[styles.modalActionButton, { backgroundColor: theme.primary }]} onPress={handleShareReceipt}>
                        <Ionicons name="share-outline" size={20} color={theme.textOnPrimary} style={{ marginRight: 8 }} />
                        <Text style={styles.modalActionButtonText}>Share / Print Receipt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalActionButton, { backgroundColor: 'transparent' }]} onPress={onClose}>
                        <Text style={[styles.modalActionButtonText, { color: theme.textSecondary }]}>Close</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </View>
        </Modal>
    );
};

const getStyles = (theme) => StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', maxWidth: 400, backgroundColor: theme.surface, borderRadius: 20, padding: 25, alignItems: 'center' },
    modalIcon: { marginBottom: 15 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 25 },
    modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 10 },
    modalDetailLabel: { color: theme.textSecondary, fontSize: 14 },
    modalDetailValue: { color: theme.text, fontSize: 14, flexShrink: 1, textAlign: 'right' }, // Added for better text wrapping
    modalDetailValueBold: { color: theme.text, fontSize: 14, fontWeight: 'bold' },
    modalSeparator: { height: 1, backgroundColor: theme.border, width: '100%', marginVertical: 10 },
    modalActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 14, borderRadius: 16, marginTop: 10 },
    modalActionButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
});

export default ReceiptDetailModal;