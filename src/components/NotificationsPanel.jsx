import React, { useEffect, useRef } from 'react';
import { BellIcon as Bell, XIcon as X, UserPlusIcon as UserPlus, CheckCircleIcon as CheckCircle, ZapIcon as Zap, AwardIcon as Award, GlobeIcon as Globe, XCircleIcon as XCircle, Trash2Icon as Trash2 } from './Icons';

export const NotificationsPanel = ({ 
    isOpen, 
    onClose, 
    notifications = [], 
    onMarkRead, 
    onMarkAllRead, 
    onClearAll, 
    onRemove,
    setCurrentPage
}) => {
    const containerRef = useRef(null);

    // Detect click outside to close the panel
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(e.target)) {
                // If we clicked the notification bell trigger, let that trigger handle it
                if (e.target.closest('.notif-bell')) return;
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Relative date formatting helper
    const formatTime = (ts) => {
        if (!ts) return '';
        const date = new Date(ts);
        const now = new Date();
        const diff = Math.floor((now - date) / 60000); // in minutes
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        
        const hours = Math.floor(diff / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const getIcon = (type) => {
        switch (type) {
            case 'friend_request':
                return <UserPlus size={16} style={{ color: 'var(--neon)' }} />;
            case 'friend_accepted':
                return <CheckCircle size={16} style={{ color: 'var(--green)' }} />;
            case 'challenge_sent':
                return <Zap size={16} style={{ color: 'var(--accent)' }} />;
            case 'challenge_completed':
                return <Award size={16} style={{ color: 'var(--gold)' }} />;
            case 'challenge_accepted':
                return <Globe size={16} style={{ color: 'var(--purple)' }} />;
            case 'proof_approved':
                return <CheckCircle size={16} style={{ color: 'var(--green)' }} />;
            case 'proof_rejected':
                return <XCircle size={16} style={{ color: 'var(--red)' }} />;
            case 'creator_payout':
                return <Award size={16} style={{ color: 'var(--gold)' }} />;
            case 'withdrawal_approved':
                return <CheckCircle size={16} style={{ color: 'var(--green)' }} />;
            case 'withdrawal_rejected':
                return <XCircle size={16} style={{ color: 'var(--red)' }} />;
            default:
                return <Bell size={16} style={{ color: 'var(--muted)' }} />;
        }
    };

    const getMessage = (n) => {
        switch (n.type) {
            case 'friend_request':
                return (
                    <span>
                        <strong>{n.fromName}</strong> sent you a friend request.
                    </span>
                );
            case 'friend_accepted':
                return (
                    <span>
                        <strong>{n.fromName}</strong> accepted your friend request!
                    </span>
                );
            case 'challenge_sent':
                return (
                    <span>
                        <strong>{n.fromName}</strong> challenged you: "{n.challengeName}"
                    </span>
                );
            case 'challenge_completed':
                return (
                    <span>
                        <strong>{n.fromName}</strong> submitted proof for your challenge!
                    </span>
                );
            case 'challenge_accepted':
                return (
                    <span>
                        <strong>{n.fromName}</strong> accepted your public challenge.
                    </span>
                );
            case 'proof_approved':
                return (
                    <span>
                        Your proof for "{n.challengeName}" was <strong style={{ color: 'var(--green)' }}>approved</strong>! +{n.points || 0} pts{n.prizeShare ? ` and ₹${n.prizeShare.toFixed(2)} cash!` : ''}
                    </span>
                );
            case 'proof_rejected':
                return (
                    <span>
                        Your proof was <strong style={{ color: 'var(--red)' }}>rejected</strong>.
                    </span>
                );
            case 'creator_payout':
                return (
                    <span>
                        Received Creator Reward of <strong>₹{n.amount.toFixed(2)}</strong> for completed challenge "{n.challengeName}"!
                    </span>
                );
            default:
                return <span>{n.message || 'Notification'}</span>;
        }
    };

    const handleItemClick = (n) => {
        onMarkRead(n.id);
        
        // Navigation redirects based on type
        if (n.type === 'friend_request' || n.type === 'friend_accepted') {
            setCurrentPage('friends');
        } else if (n.type === 'challenge_completed') {
            setCurrentPage('proofs');
        } else if (n.type === 'challenge_sent') {
            setCurrentPage('challenges');
        } else if (
            n.type === 'proof_approved' || 
            n.type === 'proof_rejected' || 
            n.type === 'creator_payout' || 
            n.type === 'withdrawal_approved' || 
            n.type === 'withdrawal_rejected'
        ) {
            setCurrentPage('profile');
        }
        
        onClose();
    };

    return (
        <div ref={containerRef} className="notif-panel-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Bell size={16} /> Alerts
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {notifications.length > 0 && (
                        <>
                            <button 
                                className="btn btn-ghost btn-xs" 
                                onClick={onMarkAllRead}
                                style={{ fontSize: '0.7rem' }}
                            >
                                Read All
                            </button>
                            <button 
                                className="btn btn-ghost btn-xs" 
                                onClick={onClearAll}
                                style={{ color: 'var(--accent)', fontSize: '0.7rem' }}
                            >
                                Clear All
                            </button>
                        </>
                    )}
                    <button 
                        className="notif-remove-btn" 
                        onClick={onClose}
                        style={{ opacity: 0.8, marginLeft: '0.25rem' }}
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--muted)' }}>
                        <Bell size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                        <div style={{ fontSize: '0.85rem' }}>No new notifications</div>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div 
                            key={n.id} 
                            className="notif-item" 
                            style={{ background: !n.read ? 'rgba(255, 0, 85, 0.04)' : 'transparent' }}
                        >
                            <div className="notif-icon">
                                {getIcon(n.type)}
                            </div>
                            <div 
                                className="notif-body" 
                                onClick={() => handleItemClick(n)}
                            >
                                <div className="notif-msg">
                                    {getMessage(n)}
                                </div>
                                <div className="notif-time">
                                    {formatTime(n.timestamp)}
                                </div>
                            </div>
                            {!n.read && <div className="notif-unread-dot" />}
                            <button 
                                className="notif-remove-btn" 
                                onClick={() => onRemove(n.id)}
                                title="Remove Notification"
                                style={{ alignSelf: 'center', padding: '0.3rem' }}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default NotificationsPanel;
