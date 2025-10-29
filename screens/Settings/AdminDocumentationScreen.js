// screens/AdminDocumentationScreen.js
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// --- Reusable Components for Structured Documentation (Unchanged) ---

const DocSection = ({ title, children }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
};

const DocParagraph = ({ children }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return <Text style={styles.paragraph}>{children}</Text>;
};

const DocListItem = ({ children }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.listItemContainer}>
            <Ionicons name="arrow-forward-circle-outline" size={20} color={theme.primary} style={styles.listItemIcon} />
            <Text style={styles.listItemText}>{children}</Text>
        </View>
    );
};

const Highlight = ({ children }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return <Text style={styles.highlight}>{children}</Text>;
};


// --- Main Documentation Screen ---

export default function AdminDocumentationScreen() {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.mainTitle}>App Documentation</Text>
                <Text style={styles.mainSubtitle}>A guide to managing the FiBear Network system.</Text>

                <DocSection title="Understanding User Roles">
                    <DocParagraph>
                        This admin panel has three distinct user roles, each with specific permissions. The tabs and features you see are based on your assigned role.
                    </DocParagraph>
                    <Text style={styles.subHeader}>Super Admin</Text>
                    <DocListItem>
                        Has full system oversight. Can manage users, subscriptions, billing, job orders, tickets, and system configuration.
                    </DocListItem>
                    <Text style={styles.subHeader}>Collector</Text>
                    <DocListItem>
                        Focused on financial tasks. Can view the dashboard and manage the <Highlight>Billing</Highlight> section to track payments and view invoices.
                    </DocListItem>
                    <Text style={styles.subHeader}>Field Agent</Text>
                    <DocListItem>
                        Responsible for on-site tasks. Can view their assigned <Highlight>Job Orders</Highlight> and handle related <Highlight>Support Tickets</Highlight>.
                    </DocListItem>
                </DocSection>

                <DocSection title="Dashboard Overview">
                    <DocParagraph>
                        The Dashboard provides a real-time snapshot of system health. Key metrics include total subscribers, pending payments, and open tickets. The statistics you see may be tailored to your role.
                    </DocParagraph>
                </DocSection>

                <DocSection title="Core Workflow: Managing a New Subscriber">
                    <DocParagraph>
                        The "Action Inbox" (or <Highlight>Pending</Highlight> tab) is the central hub for pending tasks. This workflow is primarily managed by users with the <Highlight>Super Admin</Highlight> role.
                    </DocParagraph>
                    
                    <Text style={styles.subHeader}>Step 1: Approve Verification</Text>
                    <DocListItem>
                        An application in <Highlight>Pending Application</Highlight> status appears. Review the user's details and click "Approve" to create the initial bill and a job order.
                    </DocListItem>

                    <Text style={styles.subHeader}>Step 2: Installation</Text>
                    <DocParagraph>
                        A field agent is assigned the job order. No action is required from the admin until the installation is complete.
                    </DocParagraph>

                    <Text style={styles.subHeader}>Step 3: Activate Subscription</Text>
                    <DocListItem>
                        Once the field agent confirms installation is complete, find the user in the <Highlight>Pending Installation</Highlight> section and click "Activate" to start their billing cycle.
                    </DocListItem>
                </DocSection>

                <DocSection title="Ticket Management">
                    <DocParagraph>
                        This section is for formal support requests and is available to both <Highlight>Super Admins</Highlight> and <Highlight>Field Agents</Highlight> to coordinate on technical issues.
                    </DocParagraph>
                    <DocListItem>
                        You can send <Highlight>one comprehensive reply</Highlight> per ticket. This reply can be edited or deleted.
                    </DocListItem>
                    <DocListItem>
                        Update the ticket's status (<Highlight>In Progress</Highlight>, <Highlight>Resolved</Highlight>) to keep the user informed.
                    </DocListItem>
                </DocSection>

                <DocSection title="Live Chat">
                    <DocParagraph>
                        Live Chat provides real-time assistance. An <Highlight>unread dot</Highlight> indicates new user messages. This feature is exclusive to <Highlight>Super Admins</Highlight>.
                    </DocParagraph>
                    <DocListItem>
                        After the conversation, you must <Highlight>close the chat</Highlight> to archive it.
                    </DocListItem>
                </DocSection>
                
                <DocSection title="User Management">
                    <DocParagraph>
                       The "User Management" screen is a full directory of every user. This is an exclusive feature for the <Highlight>Super Admin</Highlight> role.
                    </DocParagraph>
                    <DocListItem>
                        Search for users by name or email.
                    </DocListItem>
                     <DocListItem>
                        Tap any user to see their detailed profile, including all associated subscriptions, bills, and tickets.
                    </DocListItem>
                </DocSection>

                <DocSection title="Activity Log">
                    <DocParagraph>
                        The Activity Log provides a chronological timeline of all significant system events, useful for auditing. Access is limited to <Highlight>Super Admins</Highlight>.
                    </DocParagraph>
                </DocSection>

                <DocSection title="System Configuration">
                    <DocParagraph>
                        This screen allows <Highlight>Super Admins</Highlight> to manage dynamic API keys for services like SendGrid (emails) and Xendit (payments).
                    </DocParagraph>
                </DocSection>

                 <DocSection title="Getting Help">
                    <DocParagraph>
                       If you encounter issues or have questions not covered in this guide, please use the "Contact Support" option in the Settings tab.
                    </DocParagraph>
                </DocSection>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Styles (Unchanged) ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContainer: { padding: 16, paddingBottom: 40 },
    mainTitle: { fontSize: 28, fontWeight: 'bold', color: theme.text, marginBottom: 4, paddingHorizontal: 5 },
    mainSubtitle: { fontSize: 16, color: theme.textSecondary, marginBottom: 20, paddingHorizontal: 5 },
    card: {
        backgroundColor: theme.surface,
        borderRadius: 14,
        padding: 20,
        marginBottom: 20,
    },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
    subHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.text,
        marginTop: 15,
        marginBottom: 10,
    },
    paragraph: { fontSize: 15, color: theme.textSecondary, lineHeight: 22, marginBottom: 10 },
    listItemContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    listItemIcon: { marginRight: 10, marginTop: 1 },
    listItemText: {
        flex: 1,
        fontSize: 15,
        color: theme.textSecondary,
        lineHeight: 22,
    },
    highlight: {
        backgroundColor: theme.primary + '20',
        color: theme.primary,
        fontWeight: '600',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
});