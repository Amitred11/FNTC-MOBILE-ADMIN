// screens/Main/AdminMessageDetailScreen.js
import React, { useLayoutEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function AdminMessageDetailScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { showAlert } = useAlert();
  const { messageId } = route.params;
  
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMessage = useCallback(async () => {
    try {
        const { data } = await api.get(`/admin/contact-messages/${messageId}`);
        setMessage(data);
    } catch (error) {
        showAlert('Error', 'Failed to load message details.');
        navigation.goBack();
    } finally {
        setIsLoading(false);
    }
  }, [messageId, showAlert, navigation]);

  useFocusEffect(
    useCallback(() => {
        setIsLoading(true);
        fetchMessage();
    }, [fetchMessage])
  );

  const handleReply = () => {
    if (!message) return;
    const url = `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        showAlert('Error', 'No email client is available to handle this request.');
      }
    });
  };

  const handleDelete = () => {
    if (!message) return;
    showAlert("Confirm Delete", "Are you sure you want to permanently delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/admin/contact-messages/${message._id}`);
            showAlert('Success', 'Message deleted.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
          } catch (error) {
            showAlert('Error', 'Failed to delete the message.');
          }
        }
      }
    ]);
  };
  
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Message Details', 
      headerRight: null, 
    });
  }, [navigation]);

  if (isLoading || !message) {
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
        </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.subject}>{message.subject}</Text>
        <View style={styles.metaContainer}>
            <View style={styles.metaLine}>
                <Ionicons name="person-outline" size={18} color={theme.textSecondary} style={styles.metaIcon} />
                <Text style={styles.metaLabel}>From:</Text>
                <Text style={styles.metaValue} selectable>{message.name}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.metaLine}>
                <Ionicons name="mail-outline" size={18} color={theme.textSecondary} style={styles.metaIcon} />
                <Text style={styles.metaLabel}>Email:</Text>
                <Text style={styles.metaValue} selectable>{message.email}</Text>
            </View>
             <View style={styles.separator} />
            <View style={styles.metaLine}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} style={styles.metaIcon} />
                <Text style={styles.metaLabel}>Received:</Text>
                <Text style={styles.metaValue}>{new Date(message.createdAt).toLocaleString()}</Text>
            </View>
        </View>
        <View style={styles.messageBubble}>
            <Text style={styles.messageText}>{message.message}</Text>
        </View>

      </ScrollView>
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleReply}>
            <Ionicons name="arrow-undo-outline" size={22} color={theme.primary} />
            <Text style={[styles.actionButtonText, { color: theme.primary }]}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
            <Text style={[styles.actionButtonText, { color: theme.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  scrollContainer: { padding: 20, paddingBottom: 100 }, 
  
  subject: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 15,
  },

  metaContainer: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metaIcon: {
    marginRight: 12,
  },
  metaLabel: {
    fontSize: 15,
    color: theme.textSecondary,
    width: 80,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 15,
    color: theme.text,
    flex: 1,
  },

  separator: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 4,
  },

  messageBubble: {
    backgroundColor: theme.background, 
    borderRadius: 15,
    borderTopLeftRadius: 0,
    padding: 20,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 26,
    color: theme.text,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    paddingBottom: 25, 
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
    backgroundColor: theme.background,
  },
  deleteButton: {
  },
  actionButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});