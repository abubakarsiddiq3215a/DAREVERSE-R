import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircleIcon as CheckCircle, XCircleIcon as XCircle, ZapIcon as Zap, BellIcon as Bell } from './Icons';
import { registerToastTrigger } from '../services/gamification';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'default') => {
        const id = Date.now() + Math.random().toString(36).substr(2, 4);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove toast after 3.5s
        setTimeout(() => {
            setToasts((prev) => prev.filter(t => t.id !== id));
        }, 3800);
    };

    // Bridge with the gamification engine
    useEffect(() => {
        registerToastTrigger(showToast);
        return () => {
            registerToastTrigger(null);
        };
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle />;
            case 'error':
                return <XCircle />;
            case 'info':
                return <Zap />;
            default:
                return <Bell />;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        {getIcon(t.type)}
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
