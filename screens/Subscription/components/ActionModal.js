// src/components/modals/ActionModal.js
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, KeyboardAvoidingView,
  ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const ActionModal = ({
  isVisible, onClose, title, primaryButtonText, onPrimaryButtonPress,
  isPrimaryDisabled = false, theme, buttonType = 'primary', children,
  noScrollView = false,
}) => {
  const styles = getStyles(theme);
  const modalRef = React.useRef(null);

  const closeModal = () => {
    if (modalRef.current) {
      modalRef.current.zoomOut(400).then(onClose);
    } else {
      onClose();
    }
  };

  const getButtonColors = () => {
    if (isPrimaryDisabled) return [theme.primary, theme.disabled];
    if (buttonType === 'destructive') return [theme.danger, theme.dangerDark || '#c03b2b'];
    if (buttonType === 'submit') return [theme.primary, theme.dangerDark || '#c03b2b'];
    return [theme.primary, theme.primaryDark];
  };

  const ContentContainer = noScrollView ? View : ScrollView;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={closeModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBackdrop}
      >
        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeModal} />
        
        <Animatable.View ref={modalRef} animation="zoomIn" duration={500} style={styles.modalContainer}>
          <LinearGradient colors={getButtonColors()} style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Ionicons name="close" size={24} color={theme.textOnPrimary || '#FFFFFF'} />
            </TouchableOpacity>
          </LinearGradient>

          <ContentContainer 
            style={noScrollView ? styles.contentView : styles.scrollViewStyle}
            contentContainerStyle={!noScrollView ? styles.scrollViewContentContainer : {}}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ContentContainer>

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={closeModal} disabled={isPrimaryDisabled}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onPrimaryButtonPress} disabled={isPrimaryDisabled} activeOpacity={0.8}>
              <LinearGradient colors={getButtonColors()} style={styles.primaryButton}>
                {isPrimaryDisabled 
                  ? <ActivityIndicator size="small" color={theme.textOnPrimary || '#FFFFFF'} />
                  : <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: {
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    backgroundColor: theme.background,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.textOnPrimary || '#FFFFFF' },
  closeButton: { padding: 5 },
  
  scrollViewStyle: {
    paddingHorizontal: 24,
  },
  scrollViewContentContainer: { paddingVertical: 24, },
  
  contentView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  secondaryButtonText: { color: theme.textSecondary, fontWeight: 'bold', fontSize: 16 },
  primaryButton: { paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 160, minHeight: 48 },
  primaryButtonText: { color: theme.textOnPrimary || '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});

export default ActionModal;