// services/backgroundNotificationTask.js (Create this new file)

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api'; 
import { scheduleLocalNotification } from './notificationService'; 

const BACKGROUND_FETCH_TASK = 'background-notification-fetch';
const LAST_CHECKED_TIMESTAMP_KEY = 'last_notification_check_timestamp';

// 1. Define the task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  const now = Date.now();
  console.log(`[${new Date(now).toISOString()}] Background fetch task running...`);

  try {
    const lastCheckedTimestamp = await AsyncStorage.getItem(LAST_CHECKED_TIMESTAMP_KEY);

    const endpoint = lastCheckedTimestamp
      ? `/admin/notifications?since=${lastCheckedTimestamp}`
      : '/admin/notifications';
    
    const { data: newNotifications } = await api.get(endpoint);

    if (newNotifications && newNotifications.length > 0) {
      console.log(`Found ${newNotifications.length} new notifications.`);
      
      for (const notification of newNotifications) {
        await scheduleLocalNotification({
          title: notification.title,
          body: notification.message,
          data: { link: notification.link },
        });
      }
    } else {
      console.log('No new notifications found.');
    }

    await AsyncStorage.setItem(LAST_CHECKED_TIMESTAMP_KEY, new Date().toISOString());

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetchAsync() {
  console.log('Registering background fetch task...');
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 15 * 60, 
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterBackgroundFetchAsync() {
  console.log('Unregistering background fetch task...');
  return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}