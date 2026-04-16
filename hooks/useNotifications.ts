import { useState, useEffect, useCallback } from 'react';

type PermissionStatus = 'default' | 'granted' | 'denied';

export const useNotifications = () => {
  const [permission, setPermission] = useState<PermissionStatus>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<PermissionStatus> => {
    if (!('Notification' in window)) {
      console.error('This browser does not support desktop notifications.');
      return 'denied';
    }
    
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      const notification = new Notification(title, options);
      return notification;
    }
    return null;
  }, [permission]);

  return { permission, requestPermission, showNotification };
};
