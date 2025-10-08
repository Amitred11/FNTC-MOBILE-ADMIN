// screens/AdminProfileScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, ActivityIndicator, Image, KeyboardAvoidingView, Platform
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

// --- Reusable Components for the New Design ---

const ProfileHeader = ({ user, onImagePick, isUploading }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <LinearGradient
      colors={[`${theme.primary}99`, `${theme.primary}CC`]}
      style={styles.header}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={user.photoUrl ? { uri: user.photoUrl } : require('../../assets/images/default-avatar.jpg')}
          style={styles.avatar}
        />
        <TouchableOpacity style={styles.cameraButton} onPress={onImagePick}>
          <Ionicons name="camera-reverse" size={24} color={theme.primary} />
        </TouchableOpacity>
        {isUploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        )}
      </View>
      <Text style={styles.displayName}>{user.displayName}</Text>
      <Text style={styles.email}>{user.email}</Text>
    </LinearGradient>
  );
};

const InfoCard = ({ children, title }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
};

const SettingsItem = ({ icon, label, onPress, isDestructive = false }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
            <Ionicons name={icon} size={22} color={isDestructive ? theme.danger : theme.primary} />
            <Text style={[styles.settingsItemText, isDestructive && { color: theme.danger }]}>
                {label}
            </Text>
            <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
    );
};


// --- Main Screen Component ---

export default function AdminProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { user, logout, updateUser } = useAuth();
  const { showAlert } = useAlert();
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSaveChanges = async () => {
    if (displayName.trim() === user.displayName) return;
    setIsSaving(true);
    try {
      const { data: updatedUser } = await api.put('/admin/me', { displayName });
      updateUser(updatedUser);
      showAlert('Success', 'Your profile has been updated.');
    } catch (error) {
      showAlert('Error', error.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickAndUploadImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert("Permission Denied", "You need to grant permission to access photos.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (pickerResult.canceled) return;
    
    setIsUploading(true);
    const uri = pickerResult.assets[0].uri;
    const formData = new FormData();
    const fileName = uri.split('/').pop();
    const fileType = fileName.split('.').pop();

    formData.append('profileImage', {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: fileName,
      type: `image/${fileType}`,
    });

    try {
      const { data: updatedUser } = await api.put('/admin/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(updatedUser);
      showAlert('Success', 'Profile photo updated successfully!');
    } catch (error) {
      showAlert('Upload Error', error.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    showAlert("Confirm Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: logout }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <ProfileHeader user={user} onImagePick={handlePickAndUploadImage} isUploading={isUploading}/>

          <InfoCard title="Account Details">
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your display name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <TouchableOpacity
              style={[styles.button, (isSaving || displayName === user.displayName) && styles.buttonDisabled]}
              onPress={handleSaveChanges}
              disabled={isSaving || displayName === user.displayName}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.textOnPrimary} />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </InfoCard>

          <InfoCard title="Security & Actions">
            <SettingsItem 
                icon="mail-outline" 
                label="Inbox" 
                onPress={() => navigation.navigate('AdminInbox')} 
              />
              <View style={styles.separator} />
              <SettingsItem icon="lock-closed-outline" label="Change Password" onPress={() => { /* Navigate or show modal */ }} />
              <View style={styles.separator} />
              <SettingsItem icon="log-out-outline" label="Logout" onPress={handleLogout} isDestructive />
          </InfoCard>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContainer: { paddingHorizontal: 15, paddingBottom: 40 },
    header: {
      alignItems: 'center',
      paddingVertical: 30,
      borderRadius: 20,
      marginBottom: 20,
      marginTop: 10,
      boxShadow: '2px 4px 2px rgba(0,0,0,0.4)'
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 15,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 4,
      borderColor: '#FFFFFF',
    },
    cameraButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      boxShadow: '2px 4px 2px rgba(0,0,0,0.4)'
    },
    uploadOverlay: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    displayName: { fontSize: 24, fontWeight: 'bold', color: theme.textOnPrimary, textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 2 },
    email: { fontSize: 16, color: theme.textOnPrimary, opacity: 0.9, marginTop: 4 },
    card: {
      backgroundColor: theme.surface,
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
      boxShadow: '2px 4px 2px rgba(0,0,0,0.4)'
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 20,
    },
    inputIcon: {
        paddingLeft: 15,
    },
    input: {
      flex: 1,
      color: theme.text,
      padding: 15,
      fontSize: 16,
    },
    button: {
      backgroundColor: theme.primary,
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonDisabled: { backgroundColor: theme.disabled },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    separator: { height: 1, backgroundColor: theme.border, marginVertical: 8, marginLeft: 50 },
    settingsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    settingsItemText: { fontSize: 16, color: theme.text, marginLeft: 15, flex: 1 },
  });