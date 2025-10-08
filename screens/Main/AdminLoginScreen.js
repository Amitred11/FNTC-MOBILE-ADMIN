// screens/AdminLoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

export default function AdminLoginScreen() {
    const { adminLogin } = useAuth();
    const { theme } = useTheme();
    const { showAlert } = useAlert();
    const styles = getStyles(theme);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);

    const handleLogin = async () => {
        if (!email || !password) {
            return showAlert("Error", "Please enter both email and password.");
        }
        setIsLoading(true);
        try {
            await adminLogin(email, password, rememberMe);
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
            showAlert("Login Failed", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <Animatable.View animation="fadeInDown" duration={1000}>
                    <Ionicons name="shield-half-outline" size={80} color={theme.textOnPrimary} />
                </Animatable.View>
                <Animatable.Text animation="fadeInUp" duration={1000} style={styles.headerText}>Admin Portal</Animatable.Text>
            </View>

            <Animatable.View animation="fadeInUp" duration={900} delay={300} style={styles.formContainer}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to manage your system</Text>

                    <View style={styles.inputGroup}>
                        <Ionicons name="mail-outline" size={22} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor={theme.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Ionicons name="lock-closed-outline" size={22} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!isPasswordVisible}
                            placeholderTextColor={theme.textSecondary}
                        />
                        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                            <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={styles.rememberMeContainer} 
                        onPress={() => setRememberMe(!rememberMe)}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name={rememberMe ? "checkbox" : "square-outline"} 
                            size={24} 
                            color={rememberMe ? theme.primary : theme.textSecondary} 
                        />
                        <Text style={styles.rememberMeText}>Remember Me</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
                        {isLoading ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>Sign In</Text>}
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Animatable.View>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.primary },
    header: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerText: {
        color: theme.textOnPrimary,
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 15,
        letterSpacing: 1,
    },
    formContainer: {
        flex: 2,
        backgroundColor: theme.background,
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        paddingVertical: 40,
        paddingHorizontal: 30,
    },
    kav: { flex: 1 },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: theme.textSecondary,
        marginBottom: 30,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 15,
    },
    inputIcon: {
        paddingLeft: 15,
    },
    input: {
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 12,
        fontSize: 16,
        color: theme.text,
    },
    eyeIcon: {
        padding: 12,
    },
    button: {
        backgroundColor: theme.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    buttonText: {
        color: theme.textOnPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
     rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    rememberMeText: {
        marginLeft: 10,
        fontSize: 15,
        color: theme.text,
    },
});