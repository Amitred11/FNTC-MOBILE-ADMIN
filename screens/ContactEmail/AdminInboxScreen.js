// screens/Main/AdminInboxScreen.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// --- Modern Message Card Component ---
const MessageCard = ({ item, onPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const date = new Date(item.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    return (
        <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
            {!item.isRead && <View style={styles.unreadIndicator} />}
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardSubject, !item.isRead && styles.cardUnreadSubject]} numberOfLines={1}>
                        {item.subject}
                    </Text>
                    <Text style={styles.cardDate}>{date}</Text>
                </View>
                <Text style={styles.cardSender} numberOfLines={1}>
                    From: {item.name} ({item.email})
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
        </TouchableOpacity>
    );
};

export default function AdminInboxScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { showAlert } = useAlert();
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/contact-messages');
      setMessages(data);
    } catch (error) {
      showAlert('Error', 'Failed to fetch contact messages.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showAlert]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchMessages();
    }, [fetchMessages])
  );
  
  const onRefresh = () => {
      setIsRefreshing(true);
      fetchMessages();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {messages.length > 0 ? (
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <MessageCard
              item={item}
              onPress={() => navigation.navigate('AdminMessageDetail', { messageId: item._id })}
            />
          )}
          contentContainerStyle={styles.listContainer}
          refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        />
      ) : (
        <View style={styles.center}>
          <Ionicons name="mail-open-outline" size={80} color={theme.textSecondary} />
          <Text style={styles.emptyTitle}>Inbox is Empty</Text>
          <Text style={styles.emptyText}>You have no new contact messages at the moment.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  listContainer: { paddingVertical: 10, paddingHorizontal: 15 },
  
  // Card Styles
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 15,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden', 
  },
  unreadIndicator: {
    width: 5,
    height: '120%',
    backgroundColor: theme.primary,
    position: 'absolute',
    left: 0,
    top: '-10%',
  },
  cardContent: { flex: 1, marginLeft: 15, marginRight: 10 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardSubject: {
    fontSize: 16,
    color: theme.text,
    flex: 1,
  },
  cardUnreadSubject: {
    fontWeight: 'bold',
  },
  cardDate: {
    fontSize: 12,
    color: theme.textSecondary,
    marginLeft: 8,
  },
  cardSender: {
    fontSize: 14,
    color: theme.textSecondary,
  },

  emptyTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: theme.text,
    marginTop: 20, 
  },
  emptyText: { 
    marginTop: 8, 
    fontSize: 16, 
    color: theme.textSecondary,
    textAlign: 'center',
  },
});