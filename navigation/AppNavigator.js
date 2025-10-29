import React from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// --- Import Screens ---
// Admin & Shared Screens
import AdminProfileScreen from '../screens/Main/AdminProfileScreen';
import AdminLoginScreen from '../screens/Main/AdminLoginScreen';
import UserDetailScreen from '../screens/Subscription/UserDetailScreen';
import PendingActionsScreen from '../screens/Subscription/SubscriptionDashboardScreen';
import OpenTicketsScreen from '../screens/Support/OpenTicketsScreen';
import AdminDashboardScreen from '../screens/Main/AdminDashboardScreen';
import LiveChatsScreen from '../screens/Support/LiveChatsScreen';
import ChatDetailScreen from '../screens/Support/ChatDetailScreen';
import TicketDetailScreen from '../screens/Support/TicketDetailScreen';
import ActivityLogScreen from '../screens/Main/ActivityLogScreen';
import BillDetailScreen from '../screens/Billing/BillDetailScreen';
import AdminSettingsScreen from '../screens/Settings/AdminSettingsScreen';
import UserManagementScreen from '../screens/Main/UserManagementScreen';
import AdminJobOrdersScreen from '../screens/JobOrders/AdminJobOrdersScreen';
import JobOrderDetailScreen from '../screens/JobOrders/JobOrderDetailScreen';
import AdminBillingScreen from '../screens/Billing/AdminBillingScreen';
import AdminConfigScreen from '../screens/Settings/AdminConfigScreen';
import AdminArchivedJobsScreen from '../screens/JobOrders/AdminArchivedJobsScreen';
import AboutScreen from '../screens/Settings/AboutScreen';
import AdminDocumentationScreen from '../screens/Settings/AdminDocumentationScreen';
import AdminMessageDetailScreen from '../screens/ContactEmail/AdminMessageDetailScreen';
import AdminInboxScreen from '../screens/ContactEmail/AdminInboxScreen';
import PlanManagementScreen from '../screens/Subscription/components/PlanManagementScreen';
import SubscriptionUserScreen from '../screens/Subscription/SubscriptionUserScreen';
import NotificationScreen from '../screens/Main/NotificationScreen';
import FieldAgentDashboardScreen from '../screens/JobOrders/FieldAgentDashboardScreen';
import BroadcastScreen from '../screens/Main/BroadcastScreen';
import AdminChangePasswordScreen from '../screens/Main/AdminChangePasswordScreen';
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- Reusable Stacks ---

const BillingStack = () => {
    const { theme } = useTheme();
    return (
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerTitleStyle: { fontWeight: '600' } }}>
            <Stack.Screen name="BillsList" component={AdminBillingScreen} options={{ title: 'Billing Management' }} />
        </Stack.Navigator>
    );
};

const ChatStack = () => {
    const { theme } = useTheme();
    return (
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerTitleStyle: { fontWeight: '600' } }}>
            <Stack.Screen name="LiveChatsList" component={LiveChatsScreen} options={{ title: 'Live Chats' }} />
        </Stack.Navigator>
    );
}

const TicketStack = () => {
    const { theme } = useTheme();
    return (
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerTitleStyle: { fontWeight: '600' } }}>
            <Stack.Screen name="TicketsList" component={OpenTicketsScreen} options={{ title: 'Support Tickets' }} />
        </Stack.Navigator>
    );
}

// Admin Job Order Stack
const AdminJobStack = () => {
    const { theme } = useTheme();
    return (
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerTitleStyle: { fontWeight: '600' } }}>
            <Stack.Screen name="JobOrdersList" component={AdminJobOrdersScreen} options={{ title: 'Job Orders' }} />
            <Stack.Screen name="JobOrderDetail" component={JobOrderDetailScreen} options={{ title: 'Job Details' }} /> 
            <Stack.Screen name="AdminArchivedJobs" component={AdminArchivedJobsScreen} options={{ title: 'Archived Jobs' }} />
        </Stack.Navigator>
    );
};

// --- [NEW] Field Agent Job Order Stack ---
const AgentJobStack = () => {
    const { theme } = useTheme();
    return (
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerTitleStyle: { fontWeight: '600' } }}>
            <Stack.Screen name="AgentDashboard" component={FieldAgentDashboardScreen} options={{ title: 'My Job Queue' }} />
            <Stack.Screen name="JobOrderDetail" component={JobOrderDetailScreen} options={{ title: 'Job Details' }} />
        </Stack.Navigator>
    );
};


function AdminRoleBasedTabs() {
    const { theme } = useTheme();
    const { user } = useAuth();
    const navigation = useNavigation();

    const HeaderLeft = () => ( <TouchableOpacity onPress={() => navigation.navigate('AdminProfile')} style={{ marginLeft: 15 }}><Ionicons name="person-circle-outline" size={28} color={theme.textOnPrimary} /></TouchableOpacity> );

    const commonScreenOptions = {
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: theme.textOnPrimary,
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: HeaderLeft,
    };

    if (!user?.role) return null;

     return (
        <Tab.Navigator screenOptions={commonScreenOptions}>
            {/* --- TABS FOR ADMIN --- */}
            {user.role === 'admin' && (
                <>
                    <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="Plan" component={PendingActionsScreen} options={{ title: 'Plan', tabBarIcon: ({ color, size }) => <Ionicons name="document-lock-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="Billing" component={BillingStack} options={{ headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="Jobs" component={AdminJobStack} options={{ headerShown: false, title: 'Jobs', tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="Chats" component={ChatStack} options={{ headerShown: false, title: 'Chats', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="Tickets" component={TicketStack} options={{ headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="headset-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="Settings" component={AdminSettingsScreen} options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
                </>
            )}

            {/* --- TABS FOR COLLECTOR --- */}
            {user.role === 'collector' && (
                <>
                    <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="Billing" component={BillingStack} options={{ headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="Settings" component={AdminSettingsScreen} options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
                </>
            )}

            {/* --- TABS FOR FIELD AGENT --- */}
            {user.role === 'field_agent' && (
                <>
                    <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="MyJobsTab" component={AgentJobStack} options={{ headerShown: false, title: 'My Jobs', tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="Tickets" component={TicketStack} options={{ headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="headset-outline" color={color} size={size} /> }} />
                    <Tab.Screen name="Settings" component={AdminSettingsScreen} options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
                </>
            )}
        </Tab.Navigator>
    );
};


export default function AppNavigator() {
    const { isStaff, isLoading } = useAuth();
    const { theme } = useTheme();

    if (isLoading) {
        return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background}}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isStaff ? (
                    <>
                        <Stack.Screen name="AdminMain" component={AdminRoleBasedTabs} />
                        <Stack.Screen name="Notification" component={NotificationScreen} options={{ headerShown: true, title: 'Notifications', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary,  headerBackTitleVisible: false }} />
                        <Stack.Screen name="AdminConfig" component={AdminConfigScreen} options={{ headerShown: true, title: 'System Configuration', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary,  headerBackTitleVisible: false }} />
                        <Stack.Screen name="ActivityLog" component={ActivityLogScreen} options={{ headerShown: true, title: 'Activity Log', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary,  headerBackTitleVisible: false }} />
                        <Stack.Screen name="AdminProfile" component={AdminProfileScreen} options={{ headerShown: true, title: 'My Profile', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                        <Stack.Screen name="UserManagementScreen" component={UserManagementScreen} options={{ headerShown: true, title: 'User Lists', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false, headerShadowVisible: false, }} />
                        <Stack.Screen name="About" component={AboutScreen} options={{ headerShown: true, headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                        <Stack.Screen name="AdminDocumentation" component={AdminDocumentationScreen} options={{ headerShown: true, title: 'Guide', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                        <Stack.Screen name="AdminInbox" component={AdminInboxScreen} options={{ headerShown: true, title: 'Admin Inbox', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                        <Stack.Screen name="PlanManagement" component={PlanManagementScreen} options={{ headerShown: true, title: 'Plan Change', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                        <Stack.Screen name="Broadcast" component={BroadcastScreen} options={{ headerShown: true, title: 'Broadcast', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                        <Stack.Screen name="AdminChangePassword" component={AdminChangePasswordScreen} options={{ headerShown: true, title: 'Change Password', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                        {/* DetailScreens */}
                        <Stack.Screen name="UserDetail" component={UserDetailScreen} options={{ headerShown: true, title: 'User Profile', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false, headerShadowVisible: false, }} />
                        <Stack.Screen name="BillDetail" component={BillDetailScreen} options={{ headerShown: true,title: 'Bill Detail', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false, headerShadowVisible: false }} />
                        <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ headerShown: true,  title: 'Ticket Details',  headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} options={{ headerShown: true, headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                        <Stack.Screen name="AdminMessageDetail" component={AdminMessageDetailScreen} options={{ headerShown: true, title: 'Message Details', headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                        <Stack.Screen name="SubscriptionUser" component={SubscriptionUserScreen} options={{ headerShown: true, title: 'Subscriber Details',  headerStyle: { backgroundColor: theme.primary }, headerTintColor: theme.textOnPrimary, headerBackTitleVisible: false }} />
                    </>  
                ) : (
                    <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}