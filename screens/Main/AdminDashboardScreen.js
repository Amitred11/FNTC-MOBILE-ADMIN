import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from "react-native-gifted-charts";
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { useAuth } from '../../contexts/AuthContext';

const theme = {
    background: '#F4F7FC',
    surface: '#FFFFFF',
    text: '#121B2E',
    textSecondary: '#6A7185',
    primary: '#4A69FF',
    accent: '#00C49F',
    danger: '#FF5A5F',
    warning: '#FFB800',
    success: '#28A745',
    shadow: 'rgba(74, 105, 255, 0.1)',
    border: '#E8EBF1',
};

const PLAN_COLORS = {
    'PLAN BRONZE': '#BF8B67',
    'PLAN SILVER': '#A8A9AD',
    'PLAN GOLD': '#F2C94C',
    'PLAN PLATINUM': '#82D1F5',
    'PLAN DIAMOND': '#9B59B6',
};
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

// --- [UPDATED] Reusable Components ---
const DashboardHeader = () => {
  const navigation = useNavigation();
  const { user } = useAuth(); // Get authenticated admin user

  return (
    <View style={styles.headerContainer}>
      <View>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Analytics & System Overview</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('AdminProfile')}>
        <Image
          // Use the admin's photoUrl from AuthContext, with a fallback
          source={user?.photoUrl ? { uri: user.photoUrl } : require('../../assets/images/default-avatar.jpg')}
          style={styles.avatar}
        />
      </TouchableOpacity>
    </View>
  );
};

const StatCard = ({ label, value, icon, iconBgColor, trend, trendColor }) => (
    <View style={styles.statCard}>
        <View style={[styles.statIconContainer, { backgroundColor: iconBgColor || theme.primary }]}>
            {icon}
        </View>
        <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
        {trend && (
             <View style={styles.trendContainer}>
                <Ionicons name={trend.startsWith('+') ? "arrow-up" : "arrow-down"} size={14} color={trendColor} />
                <Text style={[styles.trendText, { color: trendColor }]}>{trend}</Text>
             </View>
        )}
    </View>
);


const UserRow = ({ item, isLast }) => {
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Overdue': return { label: 'Pending', backgroundColor: '#FEF3C7', color: '#D97706' };
            case 'Suspended': return { label: 'Disconnected', backgroundColor: '#FEE2E2', color: '#DC2626' };
            case 'Due': return { label: 'Due', backgroundColor: '#DBEAFE', color: '#2563EB' };
            default: return { label: 'Completed', backgroundColor: '#D1FAE5', color: '#059669' };
        }
    };

    const statusInfo = getStatusStyle(item.status);

    return (
        <View style={[styles.userRow, isLast && styles.lastUserRow]}>
            <View style={styles.userInfo}>
                <Image
                    // Use the photoUrl from the item prop, or fall back to a default avatar
                    source={item.photoUrl ? { uri: item.photoUrl } : require('../../assets/images/default-avatar.jpg')}
                    style={styles.userAvatar}
                />
                <View>
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userDetail}>{item.detailText}</Text>
                </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.backgroundColor }]}>
                <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
        </View>
    );
};


// --- UserStatusList now uses the efficient UserRow component ---
const UserStatusList = ({ users }) => {
    const navigation = useNavigation();
    const { user } = useAuth(); // 1. Get the current logged-in admin/user

    // 2. Create the new guarded navigation handler
    const handleViewAllPress = () => {
        if (user.role === 'admin') {
            navigation.navigate('UserManagementScreen');
        } else {
            showAlert("Access Denied", "You do not have permission to view the full user list.");
        }
    };
    
    if (!users || users.length === 0) {
        return (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
                <Ionicons name="checkmark-done-circle-outline" size={40} color={theme.success} />
                <Text style={styles.emptyText}>No users require immediate attention.</Text>
                <TouchableOpacity onPress={handleViewAllPress} style={{marginTop: 12,  borderColor: '#007BFF',  borderWidth: 1.5, borderRadius: 10, padding: 10, backgroundColor: '#F8F9FA',}}>
                   <Text style={styles.seeMoreText}>View All Users</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <View style={styles.cardHeaderWithAction}>
                <Text style={styles.cardTitle}>Subscriber Status</Text>
                <TouchableOpacity onPress={handleViewAllPress}>
                   <Text style={styles.seeMoreText}>View All</Text>
                </TouchableOpacity>
            </View>
             {users.filter(Boolean).map((item, index) => (
                <UserRow
                    key={item.id}
                    item={item}
                    isLast={index === users.length - 1}
                />
            ))}
        </View>
    );
};


// --- Chart Components (No Changes) ---
const SubscriptionDistributionChart = ({ data, total }) => {
    const chartData = data?.map(item => ({
        value: item.percentage,
        color: PLAN_COLORS[item.name] || '#ccc',
        text: `${item.percentage}%`,
        shiftTextX: -10,
        shiftTextY: 0,
    })) || [];

    if (chartData.length === 0) {
        return (
            <View style={[styles.card, styles.centered]}>
                <Text style={styles.emptyText}>No subscription data available.</Text>
            </View>
        );
    }
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Subscription Distribution</Text>
            <View style={styles.pieChartContainer}>
                <PieChart
                    data={chartData}
                    donut
                    showText
                    textColor="white"
                    radius={90}
                    innerRadius={50}
                    textSize={12}
                    fontWeight="600"
                    centerLabelComponent={() => (
                        <View style={styles.centered}>
                            <Text style={styles.pieChartCenterText}>{total}</Text>
                            <Text style={styles.pieChartCenterLabel}>Subscribers</Text>
                        </View>
                    )}
                />
            </View>
            <View style={styles.legendContainer}>
                {data.map(item => (
                    <View key={item.name} style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: PLAN_COLORS[item.name] || '#ccc' }]} />
                        <Text style={styles.legendText}>{`${item.name.replace('PLAN ', '')} (${item.count})`}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const MonthlySubscribersBarChart = ({ data }) => {
    const planNames = Object.keys(PLAN_COLORS);

    const chartData = MONTH_NAMES.flatMap((name, index) => {
        const monthData = data?.find(d => d.month === index + 1);

        const barsForThisMonth = planNames.map((planName, planIndex) => {
            const planInfo = monthData?.plans.find(p => p.name === planName);
            const value = planInfo?.count || 0;

            const barObject = {
                value: value,
                frontColor: PLAN_COLORS[planName],
                spacing: 1,
            };

            if (planIndex === 0) {
                barObject.label = name;
            }
            return barObject;
        });

        return barsForThisMonth;
    });

    if (!data || !data.some(month => month.plans.length > 0)) {
        return (
            <View style={[styles.card, styles.centered]}>
                <Text style={styles.emptyText}>No new subscriber data for this period.</Text>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Monthly New Subscribers</Text>
            <BarChart
                data={chartData}
                barWidth={8}
                spacing={28}
                roundedTop
                xAxisLabelTextStyle={styles.chartLabel}
                yAxisTextStyle={styles.chartLabel}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={theme.border}
                noOfSections={4}
                isAnimated
                labelWidth={40}
            />
            <View style={styles.legendContainer}>
                {planNames.map(planName => (
                    <View key={planName} style={styles.legendItem}>
                        <View style={[styles.legendColorBox, { backgroundColor: PLAN_COLORS[planName] }]} />
                        <Text style={styles.legendText}>{planName.replace('PLAN ', '')}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};


// --- Main Screen (No Changes) ---
export default function AdminDashboardScreen() {
    const { showAlert } = useAlert();
    const [stats, setStats] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [userStatusList, setUserStatusList] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [statsRes, analyticsRes, userStatusRes] = await Promise.all([
                api.get('/admin/stats'), api.get('/admin/dashboard-analytics'), api.get('/admin/dashboard-user-list?limit=4'),
            ]);
            setStats(statsRes.data);
            setAnalytics(analyticsRes.data);
            setUserStatusList(userStatusRes.data);
        } catch (error) {
            console.error("API Error:", error.response ? error.response.data : error.message);
            showAlert("Fetch Error", "Could not fetch dashboard data. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [showAlert]);


    useFocusEffect(
        useCallback(() => {
            if (!stats) {
                fetchDashboardData();
            }
        }, [stats, fetchDashboardData])
    );

    if (isLoading && !stats) return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color={theme.primary} style={styles.centered} /></SafeAreaView>;
    if (!stats || !analytics || !userStatusList) {
        return (
            <SafeAreaView style={styles.container}><View style={styles.centered}>
                <Text style={styles.emptyText}>Failed to load dashboard data.</Text>
                <TouchableOpacity onPress={fetchDashboardData} style={styles.retryButton}><Text style={styles.retryButtonText}>Tap to Retry</Text></TouchableOpacity>
            </View></SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDashboardData} tintColor={theme.primary} />}>
                <DashboardHeader />
                <View style={styles.statsGrid}>
                    <StatCard label="Total Subscribers" value={stats.activeSubscriptions} icon={<Ionicons name="people-outline" size={24} color="white" />} iconBgColor={theme.primary} trend={`+${analytics.quickAccess.newSubscribersThisMonth}`} trendColor={theme.success} />
                    <StatCard label="Pending Payments" value={analytics.quickAccess.overduePayments} icon={<Ionicons name="alert-circle-outline" size={24} color="white" />} iconBgColor={theme.danger} />
                    <StatCard label="Open Tickets" value={stats.openTickets} icon={<Ionicons name="chatbox-ellipses-outline" size={24} color="white" />} iconBgColor={theme.warning} />
                    <StatCard label="Total Users" value={stats.totalUsers} icon={<Ionicons name="globe-outline" size={24} color="white" />} iconBgColor={theme.accent} />
                </View>
                <MonthlySubscribersBarChart data={analytics.monthlySubscribersByPlan} />
                <SubscriptionDistributionChart data={analytics.subscriptionDistribution} total={stats.activeSubscriptions} />
                <UserStatusList users={userStatusList} />
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Styles (No Changes) ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContainer: { padding: 20, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: theme.text },
    headerSubtitle: { fontSize: 16, color: theme.textSecondary, marginTop: 2 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
    card: {
        backgroundColor: theme.surface, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 15,
        shadowColor: theme.shadow, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 1, shadowRadius: 20, elevation: 5, marginBottom: 20,
    },
    cardTitle: { fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 16 },
    statCard: {
        width: '48%', backgroundColor: theme.surface, borderRadius: 16,
        padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center',
    },
    statIconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    statTextContainer: { flex: 1 },
    statValue: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    statLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 2 },
    trendContainer: { flexDirection: 'row', alignItems: 'center', position: 'absolute', top: 10, right: 10 },
    trendText: { fontSize: 12, fontWeight: '600', marginLeft: 2 },
    pieChartContainer: { alignItems: 'center', marginVertical: 20 },
    pieChartCenterText: { fontSize: 30, fontWeight: 'bold', color: theme.text },
    pieChartCenterLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 4 },
    legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 15},
    legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginVertical: 6 },
    legendColorBox: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
    legendText: { fontSize: 13, color: theme.textSecondary },
    chartLabel: { color: theme.textSecondary, fontSize: 11 },
    emptyText: { textAlign: 'center', color: theme.textSecondary, fontStyle: 'italic', fontSize: 15, marginTop: 8 },
    retryButton: { marginTop: 20, backgroundColor: theme.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
    retryButtonText: { color: 'white', fontWeight: '600' },
    cardHeaderWithAction: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    seeMoreText: {
        color: theme.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    userRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    lastUserRow: {
        borderBottomWidth: 0,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, 
        marginRight: 10,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#E8EBF1', // Add a background color for placeholders
    },
    userName: {
        fontWeight: '600',
        color: theme.text,
        fontSize: 15,
    },
    userDetail: {
        color: theme.textSecondary,
        fontSize: 13,
        marginTop: 2,
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
});