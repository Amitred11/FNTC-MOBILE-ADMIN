import React, { useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// ✅ IconTextInput 
const IconTextInput = ({ iconName, value, onChangeText, placeholder, theme, keyboardType = 'default', secureTextEntry = false, maxLength }) => {
  const styles = getStyles(theme);
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
      <Ionicons name={iconName} size={22} color={isFocused ? theme.primary : theme.textSecondary} style={styles.inputIcon} />
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoCapitalize="none"
        maxLength={maxLength}
      />
    </View>
  );
};

const AddSubscriptionModal = ({
  theme,
  isModalVisible,
  setIsModalVisible,
  isLoadingPlans,
  plans,
  selectedPlanId,
  setSelectedPlanId,
  formData,
  handleInputChange,
  handleCreateSubscription,
  isSubmitting,
}) => {
  const styles = getStyles(theme);
  const modalRef = useRef(null);

  const closeModal = () => {
    if (modalRef.current) {
      modalRef.current.zoomOut(400).then(() => setIsModalVisible(false));
    } else {
      setIsModalVisible(false);
    }
  };

  const renderPlanItem = (plan) => (
    <TouchableOpacity
      key={plan._id}
      style={[styles.planOption, selectedPlanId === plan._id && styles.planOptionSelected]}
      onPress={() => setSelectedPlanId(plan._id)}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.planName, selectedPlanId === plan._id && styles.planNameSelected]}>{plan.name}</Text>
        <Text style={styles.planPrice}>{plan.priceLabel}</Text>
      </View>
      <View style={[styles.radioCircle, selectedPlanId === plan._id && styles.radioCircleSelected]}>
        {selectedPlanId === plan._id && (
          <Animatable.View animation="bounceIn" duration={400}>
            <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
          </Animatable.View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal animationType="fade" transparent visible={isModalVisible} onRequestClose={closeModal}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />

      <Animatable.View ref={modalRef} animation="zoomIn" duration={400} style={styles.centeredContainer}>
        <KeyboardAwareScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.modalContainer}
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Subscription</Text>
            <TouchableOpacity style={styles.closeIcon} onPress={closeModal}>
              <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form Sections */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Subscriber Info</Text>
            <IconTextInput iconName="person-circle-outline" placeholder="Full Name" value={formData.displayName} onChangeText={(t) => handleInputChange('displayName', t)} theme={theme} />
            <IconTextInput iconName="mail-outline" placeholder="Email" value={formData.email} onChangeText={(t) => handleInputChange('email', t)} keyboardType="email-address" theme={theme} />
            <IconTextInput iconName="call-outline" placeholder="Phone Number" value={formData.phoneNumber} onChangeText={(t) => handleInputChange('phoneNumber', t)} keyboardType="phone-pad" theme={theme} maxLength={11} />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Choose a Plan</Text>
            {isLoadingPlans ? (
              <ActivityIndicator color={theme.primary} size="large" style={{ paddingVertical: 20 }} />
            ) : (
              plans.map(renderPlanItem)
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionHeader}>Service Address</Text>
            <IconTextInput iconName="map-outline" placeholder="Street Address" value={formData.address} onChangeText={(t) => handleInputChange('address', t)} theme={theme} />
            <IconTextInput iconName="location-outline" placeholder="Barangay" value={formData.phase} onChangeText={(t) => handleInputChange('phase', t)} theme={theme} />
            <View style={styles.staticLocationInfo}>
              <Ionicons name="business-outline" size={20} color={theme.textSecondary} />
              <Text style={styles.staticLocationText}>
                {formData.city}, {formData.province}, {formData.zipCode}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleCreateSubscription} activeOpacity={0.8}>
              <LinearGradient
                colors={isSubmitting ? [theme.disabled, theme.disabled] : [theme.primary, theme.primaryDark]}
                style={styles.submitButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Subscription</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </Animatable.View>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scrollContainer: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContainer: {
    backgroundColor: theme.background,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    flexGrow: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text,
  },
  closeIcon: {
    position: 'absolute',
    right: 20,
    top: 20,
    padding: 4,
  },
  formSection: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  inputContainerFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.background,
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, height: 52, fontSize: 16, color: theme.text },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: theme.surface,
  },
  planOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: `${theme.primary}1A`,
  },
  planName: { fontSize: 16, fontWeight: '600', color: theme.text },
  planNameSelected: { color: theme.primary },
  planPrice: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  radioCircleSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
  staticLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  staticLocationText: {
    fontSize: 15,
    color: theme.textSecondary,
    fontWeight: '500',
    marginLeft: 10,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
});

export default AddSubscriptionModal;
