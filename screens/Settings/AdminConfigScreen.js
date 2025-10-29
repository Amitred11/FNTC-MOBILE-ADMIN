// screens/AdminConfigScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

// --- Reusable Component for Informational Notes ---
const InfoNote = ({ text }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.infoNoteContainer}>
            <Ionicons name="information-circle-outline" size={24} color={theme.primary} style={styles.infoNoteIcon} />
            <Text style={styles.infoNoteText}>{text}</Text>
        </View>
    );
};

const ConfigInput = ({ label, value, onChangeText, placeholder, error, ...props }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={[styles.apiInput, error && styles.apiInputError]}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor={theme.textSecondary}
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

export default function AdminConfigScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { showAlert } = useAlert();

    const [config, setConfig] = useState({
        emailFromName: '', emailFromAddress: '', sendgridApiKey: '',
        xenditApiKey: '', xenditCallbackToken: '', xenditTransactionFee: '0'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const fetchConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/admin/config');
            setConfig(prevConfig => ({ ...prevConfig, ...data, xenditTransactionFee: data.xenditTransactionFee?.toString() || '0' }));
        } catch (error) {
            showAlert("Error", "Could not fetch current app configuration.");
        } finally {
            setIsLoading(false);
        }
    }, [showAlert]);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const handleTextChange = (field, text) => {
        setConfig(prev => ({ ...prev, [field]: text }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        setErrors({});
        try {
            const payload = {
                ...config,
                xenditTransactionFee: parseFloat(config.xenditTransactionFee) || 0,
            };
            await api.put('/admin/config', payload);
            showAlert("Success", "Configuration has been updated successfully.");
            await fetchConfig(); 
        } catch (error) {
            if (error.response && error.response.status === 422 && error.response.data.errors) {
                setErrors(error.response.data.errors);
            } else {
                showAlert("Error", error.response?.data?.message || "Failed to update configuration.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color={theme.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <InfoNote text="These settings control integrations with third-party services. API key for Cloudinary should be set in the server's .env file for security." />
                
                <View style={styles.configCard}>
                    <Text style={styles.cardTitle}>Email Settings</Text>
                    <InfoNote text="This controls the sender name and address that users will see on all transactional emails (e.g., OTPs, notifications)." />
                    <ConfigInput label="Email 'From' Name" value={config.emailFromName} onChangeText={(text) => handleTextChange('emailFromName', text)} placeholder="e.g., FiBear Network Support" error={errors.emailFromName} />
                    <ConfigInput label="Email 'From' Address" value={config.emailFromAddress} onChangeText={(text) => handleTextChange('emailFromAddress', text)} placeholder="e.g., no-reply@fibear.com" keyboardType="email-address" autoCapitalize="none" error={errors.emailFromAddress} />
                </View>

                <View style={styles.configCard}>
                    <Text style={styles.cardTitle}>API Keys & Fees</Text>
                    
                    <InfoNote text="Get this key from your SendGrid account under Settings > API Keys. Create a key with 'Full Access' permissions." />
                    <ConfigInput label="SendGrid API Key" value={config.sendgridApiKey} onChangeText={(text) => handleTextChange('sendgridApiKey', text)} placeholder="Enter new key to change" secureTextEntry error={errors.sendgridApiKey} />
                    
                    <View style={styles.separator} />

                    <InfoNote text="Get this key from your Xendit Dashboard under Settings > API Keys. Generate a secret key with 'Write' permissions for Money-In and Money-Out." />
                    <ConfigInput label="Xendit API Key" value={config.xenditApiKey} onChangeText={(text) => handleTextChange('xenditApiKey', text)} placeholder="Enter new key to change" secureTextEntry error={errors.xenditApiKey} />
                    
                    <View style={styles.separator} />

                    <InfoNote text="Set this in your Xendit Dashboard under Webhooks. This token is used to verify that incoming webhook requests are genuinely from Xendit." />
                    <ConfigInput 
                        label="Xendit Callback Token" 
                        value={config.xenditCallbackToken} 
                        onChangeText={(text) => handleTextChange('xenditCallbackToken', text)} 
                        placeholder="Enter new token to change" 
                        secureTextEntry 
                        error={errors.xenditCallbackToken} 
                    />

                    <View style={styles.separator} />

                    <InfoNote text="Enter a flat amount to be added to each Xendit online payment to cover processing fees. Set to 0 to disable." />
                    <ConfigInput 
                        label="Xendit Transaction Fee (PHP)" 
                        value={config.xenditTransactionFee} 
                        onChangeText={(text) => handleTextChange('xenditTransactionFee', text)} 
                        placeholder="e.g., 15.00" 
                        keyboardType="numeric" 
                        error={errors.xenditTransactionFee} 
                    />
                </View>
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveConfig} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Configuration</Text>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F8FA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F8FA' },
    scrollContainer: { padding: 16, paddingBottom: 100 },
    
    infoNoteContainer: {
        flexDirection: 'row',
        backgroundColor: '#E9F5FD',
        borderRadius: 12,
        padding: 15,
        marginBottom: 16,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: theme.primary,
    },
    infoNoteIcon: {
        marginRight: 12,
    },
    infoNoteText: {
        flex: 1,
        color: theme.text,
        fontSize: 14,
        lineHeight: 20,
    },

    configCard: {
        backgroundColor: theme.surface,
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 20,
    },
    
    inputGroup: {
        width: '100%', 
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 15,
        color: theme.text,
        marginBottom: 8,
        fontWeight: '500',
    },
    apiInput: {
        backgroundColor: '#F7F8FA',
        color: theme.text,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        fontSize: 16,
    },
    apiInputError: {
        borderColor: theme.danger,
    },
    errorText: {
        color: theme.danger,
        fontSize: 13,
        marginTop: 6,
        marginLeft: 4,
    },
    
    footer: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: 16, paddingBottom: 30,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    saveButton: {
        backgroundColor: theme.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
    },
    separator: {
        height: 1,
        backgroundColor: theme.border,
        marginVertical: 20,
    }
});