// screens/AdminChangePasswordScreen.js
import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

// --- Reusable Input Component ---
const PasswordInput = ({ label, value, onChangeText, placeholder, isVisible, onToggleVisibility }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={!isVisible}
                />
                <TouchableOpacity onPress={onToggleVisibility}>
                    <Ionicons name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color={theme.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- Password Strength Meter ---
const PasswordStrengthMeter = ({ password }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const strength = useMemo(() => {
        let score = 0;
        if (!password || password.length < 8) return { score: 0, label: 'Too short', color: theme.danger };
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        switch (score) {
            case 1: return { score, label: 'Weak', color: theme.danger };
            case 2: return { score, label: 'Fair', color: '#FFA500' };
            case 3: return { score, label: 'Good', color: theme.primary };
            case 4: return { score, label: 'Strong', color: '#2ECC71' };
            default: return { score: 0, label: 'Too short', color: theme.danger };
        }
    }, [password]);

    return (
        <View>
            <View style={styles.strengthBarContainer}>
                {Array.from({ length: 4 }).map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.strengthBarSegment,
                            { backgroundColor: index < strength.score ? strength.color : theme.border }
                        ]}
                    />
                ))}
            </View>
            <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        </View>
    );
};


export default function AdminChangePasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { showAlert } = useAlert();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [visibility, setVisibility] = useState({ current: false, new: false, confirm: false });

  const handleToggleVisibility = (field) => {
      setVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert('Missing Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Mismatch', 'The new passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const { data } = await api.put('/admin/auth/change-password', {
        currentPassword,
        newPassword,
      });
      showAlert('Success', data.message, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      showAlert('Error', error.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
                <Ionicons name="lock-closed" size={50} color={theme.primary} />
                <Text style={styles.title}>Change Your Password</Text>
                <Text style={styles.subtitle}>
                    For your security, we recommend using a strong, unique password.
                </Text>
            </View>

            <PasswordInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                isVisible={visibility.current}
                onToggleVisibility={() => handleToggleVisibility('current')}
            />
            <PasswordInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter your new password"
                isVisible={visibility.new}
                onToggleVisibility={() => handleToggleVisibility('new')}
            />
            
            {newPassword.length > 0 && <PasswordStrengthMeter password={newPassword} />}

            <PasswordInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
                isVisible={visibility.confirm}
                onToggleVisibility={() => handleToggleVisibility('confirm')}
            />
        </ScrollView>

        <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={handleChangePassword} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Update Password</Text>}
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContainer: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginTop: 15 },
  subtitle: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginTop: 8 },

  inputGroup: { width: '100%', marginBottom: 20 },
  label: { fontSize: 16, color: theme.text, marginBottom: 8, fontWeight: '500' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingRight: 15,
  },
  input: { flex: 1, padding: 15, fontSize: 16, color: theme.text },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: theme.border },
  button: { backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Strength Meter Styles
  strengthBarContainer: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: -10, marginBottom: 8 },
  strengthBarSegment: { flex: 1, height: '100%', marginHorizontal: 1 },
  strengthLabel: { fontSize: 12, textAlign: 'right' },
});