import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon as Search, UserPlusIcon as UserPlus, CheckIcon as Check, XIcon as X, ShieldAlertIcon as ShieldAlert, SparklesIcon as Sparkles, HelpCircleIcon as HelpCircle } from '../components/Icons';
import { DB } from '../services/db';
import { Gamification } from '../services/gamification';
import { useToast } from '../components/Toast';
import Avatar from '../components/Avatar';
import gsap from 'gsap';

export const Friends = ({ 
    me, 
    onOpenCreateChallenge, 
    users = [],
    friendsIds = [],
    requests = [],
    onRefreshData
}) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('friends');
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);

    const userMap = {};
    users.forEach(u => {
        userMap[u.id] = u;
    });

    // GSAP staggered entry
    useEffect(() => {
        if (containerRef.current) {
            const cards = containerRef.current.querySelectorAll('.friend-card');
            if (cards.length > 0) {
                gsap.killTweensOf(cards);
                gsap.fromTo(cards,
                    { opacity: 0, scale: 0.96, y: 10 },
                    { 
                        opacity: 1, 
                        scale: 1, 
                        y: 0, 
                        duration: 0.35, 
                        stagger: 0.04, 
                        ease: 'power2.out' 
                    }
                );
            }
        }
    }, [activeTab, searchQuery]);

    const handleSendRequest = async (toId) => {
        try {
            await DB.sendRequest(me.id, toId);
            
            // Send Notification
            const notifId = 'n' + Date.now() + Math.random().toString(36).substr(2, 4);
            await DB.addNotification({ // Direct write notification
                id: notifId,
                to: toId,
                from: me.id,
                fromName: me.name || me.username || 'Player',
                type: 'friend_request',
                read: false,
                timestamp: new Date().toISOString()
            });

            showToast('Friend request sent!', 'success');
            onRefreshData();
        } catch (err) {
            console.error('Send request failed:', err);
        }
    };

    const handleAcceptRequest = async (fromId) => {
        try {
            await DB.acceptRequest(me.id, fromId);
            await Gamification.awardFriendship(me.id);
            await Gamification.awardFriendship(fromId);
            
            // Send Notification
            const notifId = 'n' + Date.now() + Math.random().toString(36).substr(2, 4);
            await DB.addNotification({
                id: notifId,
                to: fromId,
                from: me.id,
                fromName: me.name || me.username || 'Player',
                type: 'friend_accepted',
                read: false,
                timestamp: new Date().toISOString()
            });

            showToast('Friend request accepted!', 'success');
            onRefreshData();
        } catch (err) {
            console.error('Accept request failed:', err);
        }
    };

    // Filter items
    const getFilteredItems = () => {
        const queryNormalized = searchQuery.toLowerCase().trim();

        if (activeTab === 'friends') {
            const list = users.filter(u => friendsIds.includes(u.id));
            if (!queryNormalized) return list;
            return list.filter(u => 
                u.name.toLowerCase().includes(queryNormalized) || 
                u.username.toLowerCase().includes(queryNormalized)
            );
        } else if (activeTab === 'requests') {
            // Incoming requests
            const list = requests.map(r => userMap[r.fromId]).filter(Boolean);
            if (!queryNormalized) return list;
            return list.filter(u => 
                u.name.toLowerCase().includes(queryNormalized) || 
                u.username.toLowerCase().includes(queryNormalized)
            );
        } else {
            // Discover tab: Users who are NOT me, NOT already friends, and haven't sent/received request
            const existingReqIds = requests.map(r => r.fromId);
            const list = users.filter(u => 
                u.id !== me.id && 
                !friendsIds.includes(u.id) &&
                !existingReqIds.includes(u.id)
            );
            if (!queryNormalized) return list;
            return list.filter(u => 
                u.name.toLowerCase().includes(queryNormalized) || 
                u.username.toLowerCase().includes(queryNormalized)
            );
        }
    };

    const items = getFilteredItems();

    return (
        <div className="page" id="page-friends">
            <div className="section-title">
                Friends <span>&amp; Requests</span>
            </div>

            {/* Sub Tabs */}
            <div className="tabs">
                <button 
                    className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
                    onClick={() => setActiveTab('friends')}
                >
                    My Friends ({friendsIds.length})
                </button>
                <button 
                    className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                    style={{ position: 'relative' }}
                >
                    Requests
                    {requests.length > 0 && <span className="notif-dot" style={{ position: 'absolute', top: 8, right: 0 }} />}
                </button>
                <button 
                    className={`tab ${activeTab === 'discover' ? 'active' : ''}`}
                    onClick={() => setActiveTab('discover')}
                >
                    Discover
                </button>
            </div>

            {/* Search Box */}
            <div className="search-wrap">
                <Search size={18} />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or @username..."
                />
            </div>

            {/* Friends Grid */}
            <div ref={containerRef} className="friends-list" style={{ marginTop: '1rem' }}>
                {items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                        <HelpCircle size={40} style={{ margin: '0 auto 0.75rem' }} />
                        <div style={{ fontSize: '0.9rem' }}>
                            {activeTab === 'requests' ? 'No pending requests' : 'No players found'}
                        </div>
                    </div>
                ) : (
                    items.map(u => (
                        <div key={u.id} className="friend-card">
                            <Avatar user={u} isMe={u.id === me.id} size="sm" />
                            <div className="info">
                                <div className="name">{u.name}</div>
                                <div className="sub">
                                    @{u.username}
                                </div>
                            </div>
                            
                            <div className="actions">
                                {activeTab === 'friends' && (
                                    <button 
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => onOpenCreateChallenge(u)}
                                    >
                                        <Sparkles size={13} /> Challenge
                                    </button>
                                )}

                                {activeTab === 'requests' && (
                                    <button 
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleAcceptRequest(u.id)}
                                    >
                                        <Check size={13} /> Accept
                                    </button>
                                )}

                                {activeTab === 'discover' && (
                                    <button 
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleSendRequest(u.id)}
                                    >
                                        <UserPlus size={13} /> Add Friend
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Friends;
