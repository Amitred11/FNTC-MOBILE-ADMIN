import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function AdminMessageDetailScreen({ route, navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { showAlert } = useAlert();
  const { message } = route.params;

  const handleDelete = () => {
    showAlert("Confirm Delete", "Are you sure you want to permanently delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/admin/contact-messages/${message._id}`);
            showAlert('Success', 'Message deleted.', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          } catch (error) {
            showAlert('Error', 'Failed to delete the message.');
          }
        }
      }
    ]);
  };
  
  // Add a delete button to the header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleDelete} style={{ marginRight: 15 }}>
          <Ionicons name="trash-outline" size={24} color={theme.danger} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.subject}>{message.subject}</Text>
        <View style={styles.metaContainer}>
            <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>From:</Text>
                <Text style={styles.metaValue}>{message.name}</Text>
            </View>
            <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>Email:</Text>
                <Text style={styles.metaValue}>{message.email}</Text>
            </View>
            <View style={styles.metaLine}>
                <Text style={styles.metaLabel}>Date:</Text>
                <Text style={styles.metaValue}>{new Date(message.createdAt).toLocaleString()}</Text>
            </View>
        </View>
        <View style={styles.separator} />
        <Text style={styles.messageBody}>{message.message}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContainer: { padding: 20 },
  subject: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 20,
  },
  metaContainer: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  metaLine: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 15,
    color: theme.textSecondary,
    width: 60,
  },
  metaValue: {
    fontSize: 15,
    color: theme.text,
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 10,
  },
  messageBody: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.text,
  },
});