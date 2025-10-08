// components/CustomAlert.js
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const CustomAlert = ({ visible, title, message, buttons, onClose }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const getIcon = () => {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('success')) return { name: 'checkmark-circle-outline', color: theme.success };
        if (lowerTitle.includes('error') || lowerTitle.includes('failed')) return { name: 'close-circle-outline', color: theme.danger };
        if (lowerTitle.includes('confirm') || lowerTitle.includes('warning') || lowerTitle.includes('are you sure')) return { name: 'alert-circle-outline', color: theme.warning };
        return { name: 'information-circle-outline', color: theme.primary };
    };

    const { name, color } = getIcon();

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animatable.View animation="zoomIn" duration={300} style={styles.alertBox}>
                    <Ionicons name={name} size={50} color={color} style={styles.icon} />
                    
                    <Text style={styles.title}>{title}</Text>
                    
                    {message && (
                        <Text style={styles.message}>{message}</Text>
                    )}

                    <View style={styles.buttonContainer}>
                        {buttons.map((button, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.button,
                                    button.style === 'destructive' ? styles.destructiveButton : (button.style === 'cancel' ? styles.cancelButton : styles.defaultButton),
                                    buttons.length > 1 && { flex: 1 }
                                ]}
                                onPress={button.onPress}
                            >
                                <Text style={[
                                    styles.buttonText,
                                    button.style === 'destructive' ? styles.destructiveButtonText : (button.style === 'cancel' ? styles.cancelButtonText : styles.defaultButtonText)
                                ]}>
                                    {button.text}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animatable.View>
            </View>
        </Modal>
    );
};

const getStyles = (theme) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    alertBox: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: theme.surface,
        borderRadius: 15,
        padding: 25,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    icon: {
        marginBottom: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 16,
        color: theme.textSecondary,
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    defaultButton: {
        backgroundColor: theme.primary,
    },
    defaultButtonText: {
        color: theme.textOnPrimary,
    },
    destructiveButton: {
        backgroundColor: theme.danger,
    },
    destructiveButtonText: {
        color: theme.textOnPrimary,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.border,
    },
    cancelButtonText: {
        color: theme.text,
    },
});

export default CustomAlert;