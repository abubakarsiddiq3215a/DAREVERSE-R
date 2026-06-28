import React, { useState, useEffect, useRef } from 'react';
import { HomeIcon as Home, ZapIcon as Zap, PlusIcon as Plus, InboxIcon as Inbox, HelpCircleIcon as HelpCircle, EyeIcon as Eye } from '../components/Icons';
import Feed from './Feed'; // Reuses card components and formats
import Avatar from '../components/Avatar';
import { DB } from '../services/db';
import { useToast } from '../components/Toast';
import gsap from 'gsap';

export const Challenges = ({ 
    me, 
    onOpenCreateChallenge, 
    onOpenSubmitProof, 
    onOpenViewProof, 
    onOpenVerifyProof, 
    challenges = [], 
    users = [],
    friends = [],
    proofs = [],
    onRefreshData
}) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('created');
    const containerRef = useRef(null);

    const userMap = {};
    users.forEach(u => {
        userMap[u.id] = u;
    });

    const getFilteredItems = () => {
        if (activeTab === 'created') {
            return challenges.filter(c => c.creator === me.id);
        } else if (activeTab === 'pending') {
            return challenges.filter(c => 
                (c.targets || []).includes(me.id) && 
                (c.status[me.id] === 'pending' || c.status[me.id] === 'accepted')
            );
        } else {
            return challenges.filter(c => 
                (c.targets || []).includes(me.id) && 
                (c.status[me.id] === 'completed' || c.status[me.id] === 'approved')
            );
        }
    };

    const items = getFilteredItems();

    // GSAP staggered entry
    useEffect(() => {
        if (containerRef.current) {
            const cards = containerRef.current.querySelectorAll('.challenge-card');
            if (cards.length > 0) {
                gsap.killTweensOf(cards);
                gsap.fromTo(cards, 
                    { opacity: 0, y: 15 },
                    { 
                        opacity: 1, 
                        y: 0, 
                        duration: 0.4, 
                        stagger: 0.05, 
                        ease: 'power2.out' 
                    }
                );
            }
        }
    }, [activeTab, challenges]);

    // Format Relative date
    const formatDateRelative = (d) => {
        if (!d) return '';
        const date = new Date(d);
        const now = new Date();
        const diff = Math.floor((now - date) / 86400000);
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        if (diff < 7) return `${diff}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    // Category icons mapping
    const getCategoryIcon = (cat) => {
        switch (cat) {
            case 'fitness': return '🏋️';
            case 'gaming': return '🎮';
            case 'food': return '🍕';
            case 'creative': return '🎨';
            case 'entertainment': return '🎭';
            case 'honor': return '🛡️';
            case 'social': return '🗣️';
            case 'education': return '📚';
            default: return '⚡';
        }
    };

    return (
        <div className="page" id="page-challenges">
            <div className="page-header">
                <div className="section-title">
                    My <span>Challenges</span>
                </div>
                <div className="chall-header-actions">
                    <button className="btn btn-primary btn-sm" onClick={onOpenCreateChallenge}>
                        <Plus size={14} /> Create
                    </button>
                </div>
            </div>

            {/* Sub Tabs */}
            <div className="tabs">
                <button 
                    className={`tab ${activeTab === 'created' ? 'active' : ''}`}
                    onClick={() => setActiveTab('created')}
                >
                    Created by Me
                </button>
                <button 
                    className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Active
                </button>
                <button 
                    className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    Completed
                </button>
            </div>

            {/* List */}
            <div ref={containerRef} style={{ marginTop: '1rem' }} className="grid-auto">
                {items.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                        <HelpCircle size={40} style={{ margin: '0 auto 0.75rem' }} />
                        <div style={{ fontSize: '0.9rem' }}>No challenges found in this section</div>
                    </div>
                ) : (
                    /* We reuse the Feed page card layout for challenges as well */
                    items.map(c => {
                        const creator = userMap[c.creator];
                        const isMyChallenge = c.creator === me.id;
                        const targets = c.targets || [];
                        const status = c.status || {};
                        const myStatus = status[me.id] || null;
                        const completedCount = Object.values(status).filter(s => s === 'completed' || s === 'approved').length;
                        const acceptedCount = Object.values(status).filter(s => s === 'pending' || s === 'accepted' || s === 'completed' || s === 'approved').length;
                        const total = targets.length;
                        const isExpired = myStatus === 'expired';
                        const isPublic = c.isPublic || c.visibility === 'public';
                        const amITarget = targets.includes(me.id);

                        let actionBtn = null;
                        if (!isMyChallenge && amITarget) {
                            if (myStatus === 'pending') {
                                actionBtn = (
                                    <button 
                                        className="btn btn-primary btn-sm" 
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            // Handle accept
                                            if (window.confirm(`Accept challenge "${c.name}"?`)) {
                                                const updatedStatus = { ...status, [me.id]: 'accepted' };
                                                await DB.updateChallenge(c.id, { status: updatedStatus });
                                                showToast('Challenge accepted! Submit proof when ready.', 'success');
                                                onRefreshData();
                                            }
                                        }}
                                    >
                                        <Zap size={13} /> Accept
                                    </button>
                                );
                            } else if (myStatus === 'accepted') {
                                actionBtn = (
                                    <button 
                                        className="btn btn-primary btn-sm" 
                                        onClick={() => onOpenSubmitProof(c, 'submit')}
                                    >
                                        <Inbox size={13} /> Submit Proof
                                    </button>
                                );
                            } else if (myStatus === 'completed' || myStatus === 'approved') {
                                actionBtn = (
                                    <button 
                                        className="btn btn-success btn-sm" 
                                        onClick={() => onOpenViewProof(c)}
                                    >
                                        <Eye size={13} /> View
                                    </button>
                                );
                            }
                        } else if (isMyChallenge) {
                            const pendingForMe = proofs.filter(p => p.chalId === c.id && p.approved === null && p.fromId !== me.id);
                            if (pendingForMe.length > 0) {
                                actionBtn = (
                                    <button 
                                        className="btn btn-warn btn-sm" 
                                        onClick={() => onOpenVerifyProof(pendingForMe[0], c)}
                                    >
                                        Review ({pendingForMe.length})
                                    </button>
                                );
                            }
                        }

                        const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
                        const targetUsers = targets.map(id => userMap[id]).filter(Boolean);

                        return (
                            <div key={c.id} className="challenge-card">
                                <div className="card-header" style={{ alignItems: 'center' }}>
                                    <div className="challenge-icon">
                                        <span style={{ fontSize: '1.25rem' }}>{getCategoryIcon(c.category)}</span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="challenge-title" style={{ fontSize: '1.1rem', marginBottom: '0.15rem' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                            by <strong style={{ color: 'var(--text)' }}>{creator ? (isMyChallenge ? 'You' : creator.name) : 'Player'}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body" style={{ paddingTop: '0.85rem', paddingBottom: '0.85rem' }}>
                                    <div className="challenge-desc" style={{ marginBottom: '0.75rem' }}>{c.desc}</div>
                                    
                                    <div className="card-badges-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                        {isPublic ? (
                                            <span className="badge badge-purple">Public</span>
                                        ) : (
                                            <span className="badge badge-blue">Friends</span>
                                        )}
                                        {c.isHonor && <span className="badge badge-gold">Honor</span>}
                                        {c.hasPrizePool && (
                                            <span className="badge badge-gold" style={{ border: '1px solid rgba(255, 214, 0, 0.3)', boxShadow: '0 0 8px rgba(255, 214, 0, 0.2)' }}>
                                                💰 ₹{c.prizePool} pool ({c.winnersLimit || 5} { (c.winnersLimit || 5) === 1 ? 'winner' : 'winners' })
                                            </span>
                                        )}
                                        <span className={`badge diff-${c.difficulty}`}>{c.difficulty}</span>
                                    </div>

                                    {isPublic ? (
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                                🤝 {acceptedCount} accepted · ✅ {completedCount} verified
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifySpaceBetween: 'space-between', marginBottom: '0.35rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Conquered</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600, marginLeft: 'auto' }}>
                                                    {completedCount}/{total}
                                                </span>
                                            </div>
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: `${progressPct}%` }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="card-footer" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {isPublic ? (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--purple)', fontWeight: 600 }}>Public Community</span>
                                        ) : (
                                            <>
                                                {!isPublic && targetUsers.slice(0, 3).map(t => (
                                                    <Avatar key={t.id} user={t} isMe={t.id === me.id} size="sm" />
                                                ))}
                                            </>
                                        )}
                                    </div>
                                    <div className="card-actions" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginLeft: 'auto' }}>
                                        {actionBtn}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Challenges;
