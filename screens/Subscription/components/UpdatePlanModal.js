// src/screens/Subscription/components/UpdatePlanModal.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import ActionModal from './ActionModal';
import api from '../../../services/api';

const UpdatePlanModal = ({ theme, isVisible, onClose, subscription, onComplete }) => {
    const styles = getStyles(theme);
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPlanId, setSelectedPlanId] = useState(subscription?.planId?._id);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isVisible) {
            const fetchPlans = async () => {
                setIsLoading(true);
                try {
                    const { data } = await api.get('/admin/plans');
                    setPlans(data.filter(p => p.isActive));
                } catch (error) { console.error("Failed to fetch plans", error); }
                finally { setIsLoading(false); }
            };
            fetchPlans();
        }
    }, [isVisible]);

    const handleUpdate = async () => {
        if (!selectedPlanId || selectedPlanId === subscription?.planId?._id) return;
        setIsSubmitting(true);
        try {
            await api.post(`/admin/subscriptions/${subscription._id}/change-plan`, { newPlanId: selectedPlanId });
            onComplete();
        } catch (error) { console.error("Failed to update plan", error); }
        finally { setIsSubmitting(false); }
    };

    const renderPlan = (plan) => {
        const isSelected = selectedPlanId === plan._id;
        const isCurrent = subscription?.planId?._id === plan._id;

        return (
            <Animatable.View key={plan._id} animation="fadeInUp" duration={500}>
                <TouchableOpacity
                    style={[styles.planCard, isSelected && styles.planCardSelected]}
                    onPress={() => setSelectedPlanId(plan._id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.planDetails}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                           <Text style={[styles.planName, isSelected && styles.planNameSelected]}>{plan.name}</Text>
                           {isCurrent && <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current</Text></View>}
                        </View>
                        <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                            {plan.priceLabel}
                        </Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && 
                            <Animatable.View animation="zoomIn" duration={300}>
                                <Ionicons name="checkmark-sharp" size={20} color="#FFFFFF" />
                            </Animatable.View>
                        }
                    </View>
                </TouchableOpacity>
            </Animatable.View>
        );
    };

    return (
        <ActionModal
            isVisible={isVisible}
            onClose={onClose}
            title="Change Subscription Plan"
            primaryButtonText="Confirm Update"
            onPrimaryButtonPress={handleUpdate}
            isPrimaryDisabled={isSubmitting || selectedPlanId === subscription?.planId?._id}
            theme={theme}
            buttonType="submit"
            noScrollView={false} 
        >
            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={styles.loaderText}>Fetching available plans...</Text>
                </View>
            ) : (
                <View>
                    {plans.map(plan => renderPlan(plan))}
                </View>
            )}
        </ActionModal>
    );
};

const getStyles = (theme) => StyleSheet.create({
    loaderContainer:{
        justifyContent:'center',
        alignItems:'center',
        paddingVertical: 40, 
    },
    loaderText:{marginTop:15,fontSize:16,color:theme.textSecondary},
    planCard:{
        flexDirection:'row',
        alignItems:'center',
        padding:20,
        borderWidth:1.5,
        borderColor:theme.border,
        borderRadius:16,
        marginBottom:12,
        backgroundColor:theme.surface,
        boxShadow: '2px 4px 2px rgba(0,0,0,0.4)'
    },
    planCardSelected:{
        borderColor:theme.primary,
        backgroundColor:`${theme.primary}1A`,
        transform:[{scale:1.02}],
        shadowColor: theme.primary,
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    planDetails:{flex:1},
    planName:{fontSize:17,fontWeight:'600',color:theme.text},
    planNameSelected:{color:theme.primary},
    planPrice:{fontSize:15,color:theme.textSecondary,marginTop:6},
    planPriceSelected:{color:theme.primary},
    currentBadge:{backgroundColor:theme.success,paddingHorizontal:8,paddingVertical:3,borderRadius:8,marginLeft:10},
    currentBadgeText:{color:theme.textOnPrimary || '#FFFFFF',fontSize:12,fontWeight:'500'},
    radioCircle:{width:28,height:28,borderRadius:14,borderWidth:2,borderColor:theme.border,justifyContent:'center',alignItems:'center',marginLeft:16},
    radioCircleSelected:{backgroundColor:theme.primary,borderColor:theme.primary},
});

export default UpdatePlanModal;