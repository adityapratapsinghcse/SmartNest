import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    useEffect(() => {
        if (!user || !user.householdId) return;

        // Establish the Notification Alerts Stream
        const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${wsScheme}://${window.location.host.replace('3000', '8000')}/ws/alerts/`;
        
        const socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.message) {
                const newAlert = data.message;
                setAlerts((prev) => [newAlert, ...prev]);
                setUnreadCount((prev) => prev + 1);
                addToast(newAlert.message, newAlert.severity === 'high' ? 'danger' : 'warning');
            }
        };

        socket.onerror = (err) => console.error("Alert WebSocket Error:", err);
        
        return () => socket.close();
    }, [user]);

    const clearUnread = () => setUnreadCount(0);

    return (
        <NotificationContext.Provider value={{ alerts, unreadCount, toasts, clearUnread, addToast }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);