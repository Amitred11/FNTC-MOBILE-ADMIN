import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const MessageListItem = ({ item, onPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const date = new Date(item.createdAt).toLocaleDateString();

    return (
        <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
            {!item.isRead && <View style={styles.unreadDot} />}
            <View style={styles.itemContent}>
                <Text style={[styles.itemSubject, !item.isRead && styles.itemUnreadText]}>
                    {item.subject}
                </Text>
                <Text style={styles.itemDetails}>{item.name} • {date}</Text>
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

  const fetchMessages = async () => {
    try {
      const { data } = await api.get('/admin/contact-messages');
      setMessages(data);
    } catch (error) {
      showAlert('Error', 'Failed to fetch contact messages.');
    } finally {
      setIsLoading(false);
    }
  };

  // useFocusEffect refetches messages every time the screen is viewed
  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchMessages();
    }, [])
  );

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
            <MessageListItem
              item={item}
              onPress={() => navigation.navigate('AdminMessageDetail', { message: item })}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <View style={styles.center}>
          <Ionicons name="mail-open-outline" size={60} color={theme.textSecondary} />
          <Text style={styles.emptyText}>Your inbox is empty.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme.surface,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.primary,
    marginRight: 15,
  },
  itemContent: { flex: 1 },
  itemSubject: { fontSize: 16, color: theme.text, marginBottom: 4 },
  itemUnreadText: { fontWeight: 'bold' },
  itemDetails: { fontSize: 14, color: theme.textSecondary },
  separator: { height: 1, backgroundColor: theme.border },
  emptyText: { marginTop: 15, fontSize: 18, color: theme.textSecondary },
});