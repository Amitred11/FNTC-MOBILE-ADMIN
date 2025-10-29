import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Modal,
    KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { BlurView } from 'expo-blur';
import api from '../../../services/api';

// --- Subcomponents ---

const IconTextInput = ({ iconName, theme, styles, ...props }) => (
  <View style={styles.inputWrapper}>
    <Ionicons
      name={iconName}
      size={20}
      color={theme.textSecondary}
      style={styles.inputIcon}
    />
    <TextInput
      style={styles.input}
      placeholderTextColor={theme.textSecondary}
      {...props}
    />
  </View>
);

const CustomerTypeToggle = ({ billType, setBillType, styles, theme }) => (
  <View style={styles.toggleContainer}>
    <TouchableOpacity
      style={[styles.toggleButton, billType === 'existing' && styles.toggleButtonActive]}
      onPress={() => setBillType('existing')}>
      <Text style={[styles.toggleText, billType === 'existing' && styles.toggleTextActive]}>
        Existing User
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.toggleButton, billType === 'one-off' && styles.toggleButtonActive]}
      onPress={() => setBillType('one-off')}>
      <Text style={[styles.toggleText, billType === 'one-off' && styles.toggleTextActive]}>
        New Customer
      </Text>
    </TouchableOpacity>
  </View>
);

const UserListItem = React.memo(({ user, styles, theme, onSelect }) => (
  <TouchableOpacity style={styles.userResultItem} onPress={() => onSelect(user)}>
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{user.displayName.charAt(0)}</Text>
    </View>
    <View>
      <Text style={styles.resultText}>{user.displayName}</Text>
      <Text style={styles.resultSubText}>{user.email}</Text>
    </View>
  </TouchableOpacity>
));

// --- Main Component ---

const CreateBillModal = ({ theme, isVisible, onClose, onComplete }) => {
  const styles = useMemo(() => getStyles(theme), [theme]);
  const modalRef = useRef(null);

  const [billType, setBillType] = useState('existing');
  const [selectedUser, setSelectedUser] = useState(null);
  const [customerDetails, setCustomerDetails] = useState({ name: '', email: '' });
  const [lineItems, setLineItems] = useState([{ description: '', amount: '' }]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setDueDate(defaultDate.toISOString().split('T')[0]);
      if (billType === 'existing') fetchUsers();
    } else {
      setTimeout(resetState, 400);
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && billType === 'existing' && !selectedUser) {
      fetchUsers();
    } else if (billType === 'one-off') {
      setAllUsers([]);
    }
  }, [billType, selectedUser]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/subscribers/list');
      setAllUsers(data || []);
    } catch (error) {
      console.error('Failed to fetch user list:', error);
      alert('Could not load users. Please check your connection and try again.');
      setAllUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return allUsers.filter(
      (user) =>
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allUsers, searchQuery]);

  const totalAmount = useMemo(
    () => lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0),
    [lineItems]
  );

  const isFormValid = useMemo(() => {
    const commonValid =
      dueDate &&
      totalAmount > 0 &&
      lineItems.every((item) => item.description && parseFloat(item.amount) > 0);
    if (!commonValid) return false;
    if (billType === 'existing') return !!selectedUser;
    if (billType === 'one-off')
      return customerDetails.name.trim() && customerDetails.email.includes('@');
    return false;
  }, [billType, selectedUser, customerDetails, dueDate, totalAmount, lineItems]);

  const resetState = () => {
    setBillType('existing');
    setSelectedUser(null);
    setCustomerDetails({ name: '', email: '' });
    setLineItems([{ description: '', amount: '' }]);
    setAllUsers([]);
  };

  const handleClose = () => modalRef.current?.zoomOut(400).then(onClose);
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setAllUsers([]);
  };

  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
  };

  const addLineItem = () => setLineItems([...lineItems, { description: '', amount: '' }]);
  const removeLineItem = (index) =>
    setLineItems((prev) => prev.filter((_, i) => i !== index || prev.length === 1));

  const handleCreateBill = async () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    const payload = {
      dueDate,
      lineItems,
      notes,
      amount: totalAmount,
      ...(billType === 'existing'
        ? { userId: selectedUser._id }
        : { customerDetails }),
    };

    try {
      await api.post('/admin/bills/manual', payload);
      onComplete();
    } catch (error) {
      console.error('Failed to create bill:', error);
      const msg = error.response?.data?.message || 'Could not create the bill. Please try again.';
      alert(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={isVisible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBackdrop}>
        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />

        <Animatable.View ref={modalRef} animation="zoomIn" duration={500} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Manual Bill</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            contentContainerStyle={styles.scrollViewContent}
            ListHeaderComponent={
              <>
                <CustomerTypeToggle billType={billType} setBillType={setBillType} styles={styles} theme={theme} />

                {billType === 'one-off' && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Customer Details</Text>
                    <IconTextInput
                      iconName="person-outline"
                      theme={theme}
                      styles={styles}
                      placeholder="Full Name"
                      value={customerDetails.name}
                      onChangeText={(text) =>
                        setCustomerDetails({ ...customerDetails, name: text })
                      }
                    />
                    <IconTextInput
                      iconName="mail-outline"
                      theme={theme}
                      styles={styles}
                      placeholder="Email Address"
                      value={customerDetails.email}
                      onChangeText={(text) =>
                        setCustomerDetails({ ...customerDetails, email: text })
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {billType === 'existing' && selectedUser && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Selected Customer</Text>
                    <View style={styles.selectedPill}>
                      <Text style={styles.selectedPillText}>{selectedUser.displayName}</Text>
                      <TouchableOpacity onPress={() => setSelectedUser(null)}>
                        <Ionicons name="close-circle" size={22} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {billType === 'existing' && !selectedUser && (<View style={styles.card}><Text style={styles.cardTitle}>Select a Customer</Text>{isLoading && (<ActivityIndicator color={theme.primary} style={{ marginTop: 10 }} />)}{!isLoading && allUsers.length === 0 && (<Text style={styles.emptyListText}>No users available.</Text>)}</View>)}
              </>
            }
            ListFooterComponent={
              <View style={[styles.card, { marginBottom: 0 }]}>
                <Text style={styles.cardTitle}>Bill Details</Text>
                <IconTextInput
                  iconName="calendar-outline"
                  theme={theme}
                  styles={styles}
                  placeholder="Due Date (YYYY-MM-DD)"
                  value={dueDate}
                  onChangeText={setDueDate}
                />
                <View style={styles.lineItemHeader}>
                  <Text style={styles.lineItemHeaderText}>Description</Text>
                  <Text style={styles.lineItemHeaderText}>Amount</Text>
                </View>
                {lineItems.map((item, index) => (
                  <View key={index} style={styles.lineItemRow}>
                    <TextInput
                      style={[styles.lineInput, styles.lineItemDesc]}
                      placeholder={`Item #${index + 1}`}
                      value={item.description}
                      onChangeText={(text) =>
                        handleLineItemChange(index, 'description', text)
                      }
                    />
                    <TextInput
                      style={[styles.lineInput, styles.lineItemAmount]}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={item.amount}
                      onChangeText={(val) =>
                        handleLineItemChange(index, 'amount', val)
                      }
                    />
                    <TouchableOpacity
                      onPress={() => removeLineItem(index)}
                      style={styles.deleteButton}
                      disabled={lineItems.length === 1}>
                      <Ionicons
                        name="trash-outline"
                        size={22}
                        color={
                          lineItems.length === 1
                            ? theme.textSecondary + '80'
                            : theme.danger
                        }
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={addLineItem}>
                  <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
                  <Text style={styles.addButtonText}>Add Item</Text>
                </TouchableOpacity>
                <View style={styles.infoContainer}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={theme.textSecondary}
                  />
                  <Text style={styles.infoText}>
                    Please make sure all line items are correct before proceeding.
                  </Text>
                </View>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalText}>Total Amount</Text>
                  <Text style={styles.totalAmount}>${totalAmount.toFixed(2)}</Text>
                </View>
              </View>
            }
            data={billType === 'existing' && !selectedUser ? filteredUsers : []}
            renderItem={({ item }) => (
              <UserListItem user={item} theme={theme} styles={styles} onSelect={handleSelectUser} />
            )}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={
              !isLoading && billType === 'existing' && !selectedUser ? (
                <Text style={styles.emptyListText}>No users found.</Text>
              ) : null
            }
            onScrollBeginDrag={Keyboard.dismiss}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isFormValid || isSubmitting) && styles.disabledButton,
              ]}
              onPress={handleCreateBill}
              disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Bill</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// --- Stylesheet (Unchanged) ---
const getStyles = (theme) => StyleSheet.create({
    modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalContainer: { width: '100%', maxWidth: 500, maxHeight: '90%', backgroundColor: theme.background, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    scrollViewContent: { padding: 20 },
    modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background + 'F9' },
    card: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 20 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 16 },
    toggleContainer: { flexDirection: 'row', backgroundColor: theme.border, borderRadius: 12, padding: 4, marginBottom: 20 },
    toggleButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    toggleButtonActive: { backgroundColor: theme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    toggleText: { fontWeight: '600', color: theme.textSecondary },
    toggleTextActive: { color: theme.primary },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border, marginBottom: 12 },
    inputIcon: { paddingLeft: 14, paddingRight: 8 },
    input: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 16, color: theme.text },
    infoContainer: {flexDirection: 'row',alignItems: 'center',marginTop: 10,marginBottom: 6,paddingHorizontal: 4,}, 
    infoText: {marginLeft: 6,color: theme.textSecondary,fontSize: 13,flexShrink: 1,},
    userResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: theme.primary, fontSize: 16, fontWeight: 'bold' },
    resultText: { fontSize: 15, color: theme.text, fontWeight: '500' },
    resultSubText: { fontSize: 13, color: theme.textSecondary },
    emptyListText: { textAlign: 'center', paddingVertical: 20, color: theme.textSecondary, backgroundColor: theme.surface, borderRadius: 16, marginTop: -20 },
    selectedPill: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.primary + '20', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 30 },
    selectedPillText: { fontSize: 16, fontWeight: 'bold', color: theme.primary, flex: 1 },
    lineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 },
    lineItemHeaderText: { color: theme.textSecondary, fontWeight: '500' },
    lineItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    lineInput: { height: 48, paddingHorizontal: 12, fontSize: 16, color: theme.text, backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
    lineItemDesc: { flex: 3, marginRight: 8 },
    lineItemAmount: { flex: 1.5, textAlign: 'right' },
    deleteButton: { padding: 8, marginLeft: 4 },
    addButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8 },
    addButtonText: { color: theme.primary, fontWeight: '600', marginLeft: 6, fontSize: 16 },
    totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border },
    totalText: { fontSize: 16, fontWeight: '600', color: theme.text },
    totalAmount: { fontSize: 22, fontWeight: 'bold', color: theme.primary },
    primaryButton: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    primaryButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    disabledButton: { backgroundColor: theme.primary + '80' },
});

export default CreateBillModal;