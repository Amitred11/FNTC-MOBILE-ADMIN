// screens/UserManagementScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    TextInput,
    RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';

// --- Reusable Theme ---
const theme = {
    background: '#F4F7FC',
    surface: '#FFFFFF',
    text: '#121B2E',
    textSecondary: '#6A7185',
    primary: '#4A69FF',
    success: '#28A745',
    danger: '#FF5A5F',
    warning: '#FFB800',
    shadow: 'rgba(74, 105, 255, 0.1)',
    border: '#E8EBF1',
};

// --- Reusable Components ---

const SearchBar = ({ value, onChangeText, isLoading }) => (
    <View style={styles.searchContainer}>
        {isLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.searchIcon} />
        ) : (
            <Ionicons name="search-outline" size={22} color={theme.textSecondary} style={styles.searchIcon} />
        )}
        <TextInput
            placeholder="Search by name or email..."
            placeholderTextColor={theme.textSecondary}
            style={styles.searchInput}
            value={value}
            onChangeText={onChangeText}
        />
    </View>
);

const UserListItem = ({ item, onPress}) => {

    const getStatusStyle = (status) => {
        switch (status) {
            case 'active':
                return { backgroundColor: '#D1FAE5', color: '#059669' };
            case 'suspended':
                return { backgroundColor: '#FEF3C7', color: '#D97706' };
            case 'deactivated':
                return { backgroundColor: '#FEE2E2', color: '#DC2626' };
            default:
                return { backgroundColor: theme.border, color: theme.textSecondary };
        }
    };
    const statusStyle = getStatusStyle(item.status);

    return (
        <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
            <Image
                source={item.photoUrl ? { uri: item.photoUrl } : require('../../assets/images/default-avatar.jpg')}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.displayName}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                <Text style={[styles.statusText, { color: statusStyle.color }]}>{item.status}</Text>
            </View>
        </TouchableOpacity>
    );
};


// --- Main Screen Component ---

const UserManagementScreen = () => {
    const navigation = useNavigation();
    const { showAlert } = useAlert();
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const debouncedSearch = useDebounce(searchQuery, 500);

    const fetchUsers = useCallback(async (page = 1, query = '', isLoadMore = false) => {
        if (isLoadMore) setIsLoadingMore(true);
        else setIsLoading(true);

        try {
            const { data } = await api.get('/admin/users/search', {
                params: { page, query, limit: 15 }
            });
            setUsers(prev => isLoadMore ? [...prev, ...data.data] : data.data);
            setPagination(data.pagination);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            showAlert('Error', 'Could not fetch the user list. Please try again.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsLoadingMore(false);
        }
    }, [showAlert]);

    // Effect for initial load and search changes
    useEffect(() => {
        fetchUsers(1, debouncedSearch);
    }, [debouncedSearch, fetchUsers]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchUsers(1, searchQuery);
    };

    const handleLoadMore = () => {
        if (pagination.page < pagination.totalPages && !isLoadingMore) {
            fetchUsers(pagination.page + 1, searchQuery, true);
        }
    };

    const handleUserPress = (selectedUser) => {
        if (user.role === 'admin') {
            navigation.navigate('UserDetail', { userId: selectedUser._id });
        } else {
            showAlert(
                "Access Denied",
                "You do not have permission to view user details."
            );
        }
    };

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return <ActivityIndicator style={{ marginVertical: 20 }} size="small" color={theme.primary} />;
    };
    
    const renderEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color={theme.border} />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search query.' : 'There are no users to display.'}
            </Text>
        </View>
    );

    if (isLoading && users.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            </SafeAreaView>
        );
    }
    
    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={users}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <UserListItem 
                        item={item}
                        onPress={() => handleUserPress(item)}
                    />
                )}
                ListHeaderComponent={
                    <SearchBar value={searchQuery} onChangeText={setSearchQuery} isLoading={isLoading && users.length > 0} />
                }
                ListEmptyComponent={!isLoading ? renderEmptyComponent : null}
                ListFooterComponent={renderFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.primary}
                    />
                }
            />
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderRadius: 12,
        paddingHorizontal: 15,
        marginTop: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.border,
    },
    searchIcon: {
        marginRight: 10,
        width: 22,
    },
    searchInput: {
        flex: 1,
        height: 50,
        fontSize: 16,
        color: theme.text,
    },
    itemContainer: {
        backgroundColor: theme.surface,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 16,
        marginBottom: 15,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 5,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        borderWidth: 2,
        borderColor: theme.border,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.text,
    },
    userEmail: {
        fontSize: 13,
        color: theme.textSecondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginLeft: 10,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.text,
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 16,
        color: theme.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
    },
});

export default UserManagementScreen;