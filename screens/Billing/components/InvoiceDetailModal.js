// admin/components/InvoiceDetailModal.js
import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useTheme } from '../../../contexts/ThemeContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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

const InvoiceDetailModal = ({ isVisible, onClose, invoiceData }) => {
const { theme } = useTheme();
const styles = useMemo(() => getStyles(theme), [theme]);

if (!invoiceData) return null;

const handleShareInvoice = async () => {
    try {
        // [FIXED] Destructured all necessary properties from invoiceData
        const { invoiceNumber, date, dueDate, lineItems = [], amount, status, customerName, customerAddress, customerEmail, billingPeriod } = invoiceData;
        const totalAmount = amount?.toFixed(2) || '0.00';
        const formattedInvoiceDate = formatDate(date);
        const formattedDueDate = formatDate(dueDate);
        
        const lineItemsHtml = lineItems.map(item => `
            <tr><td>${item.description || 'Service/Item'}</td><td class="align-right">₱${(item.amount || 0).toFixed(2)}</td></tr>
        `).join('');

        const paidStampHtml = status === 'Paid' ? `<div class="paid-stamp">Paid</div>` : '';

        const htmlContent = `
            <html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
  <title>Invoice #${invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

    body {
      font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin: 0;
      color: #333;
      background-color: #f4f7fc;
      -webkit-print-color-adjust: exact;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 40px 15px;
      min-height: 100vh;
      box-sizing: border-box;
    }

    .invoice-container {
      display: flex;
      max-width: 800px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      border-radius: 15px;
      overflow: hidden;
    }

    .sidebar {
      background-color: #2c3e50;
      color: #ecf0f1;
      padding: 30px;
      width: 250px;
    }

    .sidebar h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }

    .sidebar-section {
      margin-bottom: 25px;
    }

    .sidebar-section h2 {
      font-size: 16px;
      color: #3498db;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .sidebar-section p {
      margin: 5px 0;
      font-size: 14px;
      line-height: 1.6;
    }

    .main-content {
      background-color: #ffffff;
      padding: 30px;
      flex: 1;
      /* --- MODIFICATION FOR STAMP POSITIONING --- */
      position: relative;
      overflow: hidden; /* Ensures stamp rotation doesn't break layout */
    }

    .header { text-align: right; margin-bottom: 40px; }
    .header h2 { color: #2c3e50; font-size: 36px; margin: 0; }
    .header p { font-size: 14px; color: #7f8c8d; margin: 5px 0; }
    .billed-to { margin-bottom: 30px; }
    .billed-to h3 { color: #3498db; font-size: 16px; margin-bottom: 10px; text-transform: uppercase; }
    .billed-to p { margin: 5px 0; font-size: 15px; }

    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; font-size: 14px; border-bottom: 1px solid #ecf0f1; }
    th { background-color: #f4f7fc; font-weight: 700; color: #2c3e50; text-transform: uppercase; }
    .align-right { text-align: right; }
    .total-row { background-color: #3498db; color: #ffffff; font-weight: 700; font-size: 18px; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #95a5a6; }

    /* --- NEW: PAID STAMP STYLES --- */
    .paid-stamp {
      position: absolute;
      top: 65px;
      right: -35px;
      transform: rotate(15deg);
      border: 5px double #2ecc71;
      color: #2ecc71;
      font-size: 32px;
      font-weight: 700;
      padding: 10px 40px;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.5;
      pointer-events: none; /* Make it non-interactive */
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="sidebar">
      <div class="sidebar-section">
        <h1>FiBear Network</h1>
        <p>Block 18, Lot 95 Phase 1D, Kasiglahan Village, Brgy San Jose, Rodriguez, Rizal</p>
        <p>09154283220 | 09707541724 | 09071049526</p>
      </div>
      <div class="sidebar-section">
        <h2>Invoice Details</h2>
        <p><strong>Invoice No:</strong> #${invoiceNumber || 'N/A'}</p>
        <p><strong>Invoice Date:</strong> ${formattedInvoiceDate}</p>
        <p><strong>Due Date:</strong> ${formattedDueDate}</p>
      </div>
      <div class="sidebar-section">
        <h2>Billing Period</h2>
        <p>${billingPeriod || 'N/A'}</p>
      </div>
    </div>
    <div class="main-content">
      ${paidStampHtml}

      <div class="header">
        <h2>INVOICE</h2>
        <p>FiBear Network Technologies Corp. Montalban</p>
      </div>
      <div class="billed-to">
        <h3>Billed To</h3>
        <p>${customerName || 'N/A'}</p>
        <p>${customerAddress || ''}</p>
        <p>${customerEmail || 'N/A'}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="align-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>
      <table>
        <tbody>
          <tr class="total-row">
            <td>TOTAL AMOUNT DUE</td>
            <td class="align-right">₱${totalAmount}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">
        <p>Thank you for your timely payment!</p>
        <p>For inquiries, please contact our support team.</p>
      </div>
    </div>
  </div>
</body>
  </html>
            `;

const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: `Share Invoice ${invoiceNumber}` });
    } catch (error) {
        console.error("Error sharing invoice:", error);
        Alert.alert('Print/Share Failed', 'An unexpected error occurred while preparing the invoice.');
    }
};

return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
            <Animatable.View animation="zoomIn" duration={300} style={styles.modalContent}>
                <Ionicons name="document-text" size={32} color={theme.primary} style={styles.modalIcon} />
                <Text style={styles.modalTitle}>Invoice Details</Text>
                <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Invoice No:</Text><Text style={styles.modalDetailValueBold}>{invoiceData.invoiceNumber}</Text></View>
                <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Invoice Date:</Text><Text style={styles.modalDetailValue}>{formatDate(invoiceData.date)}</Text></View>
                <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Due Date:</Text><Text style={styles.modalDetailValue}>{formatDate(invoiceData.dueDate)}</Text></View>
                <View style={styles.modalSeparator} />
                <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Status:</Text><Text style={[styles.modalDetailValueBold, { color: invoiceData.status === 'Paid' ? theme.success : theme.danger }]}>{invoiceData.status}</Text></View>
                <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Amount Due:</Text><Text style={[styles.modalDetailValueBold, { color: theme.primary }]}>₱{invoiceData.amount?.toFixed(2)}</Text></View>
                
                <TouchableOpacity style={[styles.modalActionButton, { backgroundColor: theme.primary }]} onPress={handleShareInvoice}>
                    <Ionicons name="share-outline" size={20} color={theme.textOnPrimary} style={{ marginRight: 8 }} />
                    <Text style={styles.modalActionButtonText}>Share / Print Invoice</Text>
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
modalDetailValue: { color: theme.text, fontSize: 14 },
modalDetailValueBold: { color: theme.text, fontSize: 14, fontWeight: 'bold' },
modalSeparator: { height: 1, backgroundColor: theme.border, width: '100%', marginVertical: 10 },
modalActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingVertical: 14, borderRadius: 16, marginTop: 10 },
modalActionButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
});

export default InvoiceDetailModal;