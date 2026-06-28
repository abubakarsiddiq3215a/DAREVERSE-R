import React, { useState, useEffect } from 'react';
import { ShieldIcon as Shield, UsersIcon as Users, ActivityIcon as Activity, ZapIcon as Zap, CameraIcon as Camera, BarChart2Icon as BarChart2, ShieldAlertIcon as ShieldAlert, GlobeIcon as Globe, ArrowLeftIcon as ArrowLeft, RefreshIcon as RefreshCw, CoinsIcon as Coins } from '../components/Icons';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import Avatar from '../components/Avatar';
import { DB } from '../services/db';

export const AdminDashboard = ({ onClose }) => {
    const [analytics, setAnalytics] = useState({
        users: [],
        challenges: [],
        proofs: [],
        gameData: {}
    });
    const [loading, setLoading] = useState(true);

    const handleWithdrawalAction = async (userId, withdrawalId, approve) => {
        try {
            const docRef = doc(db, 'gamification', userId);
            const gd = analytics.gameData[userId];
            if (!gd) return;

            const updatedWithdrawals = gd.withdrawals.map(w => {
                if (w.id === withdrawalId) {
                    return { ...w, status: approve ? 'approved' : 'rejected' };
                }
                return w;
            });

            let balance = gd.balance || 0;
            if (!approve) {
                // Refund back to balance if rejected
                const req = gd.withdrawals.find(w => w.id === withdrawalId);
                if (req) {
                    balance = parseFloat((balance + req.amount).toFixed(2));
                }
            }

            await setDoc(docRef, {
                ...gd,
                balance,
                withdrawals: updatedWithdrawals
            }, { merge: true });

            // Send notification
            const req = gd.withdrawals.find(w => w.id === withdrawalId);
            const amount = req ? req.amount : 0;
            
            const notifId = 'n' + Date.now() + Math.random().toString(36).substr(2, 4);
            await DB.addNotification({
                id: notifId,
                to: userId,
                from: 'admin',
                fromName: 'DareVerse Finance',
                type: approve ? 'withdrawal_approved' : 'withdrawal_rejected',
                read: false,
                timestamp: new Date().toISOString(),
                message: approve 
                    ? `Your withdrawal request of ₹${amount} was approved and processed!`
                    : `Your withdrawal request of ₹${amount} was rejected. Money refunded.`
            });
        } catch (error) {
            console.error("Failed to process withdrawal:", error);
        }
    };

    useEffect(() => {
        // Setup real-time subscribers
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            const list = snap.docs.map(doc => doc.data());
            setAnalytics(prev => ({ ...prev, users: list }));
        });

        const unsubChallenges = onSnapshot(collection(db, 'challenges'), (snap) => {
            const list = snap.docs.map(doc => doc.data());
            setAnalytics(prev => ({ ...prev, challenges: list }));
        });

        const unsubProofs = onSnapshot(collection(db, 'proofs'), (snap) => {
            const list = snap.docs.map(doc => doc.data());
            setAnalytics(prev => ({ ...prev, proofs: list }));
        });

        const unsubGamification = onSnapshot(collection(db, 'gamification'), (snap) => {
            const map = {};
            snap.docs.forEach(doc => {
                map[doc.id] = doc.data();
            });
            setAnalytics(prev => ({ ...prev, gameData: map }));
            setLoading(false);
        });

        return () => {
            unsubUsers();
            unsubChallenges();
            unsubProofs();
            unsubGamification();
        };
    }, []);

    if (loading) {
        return (
            <div className="page" style={{ textAlign: 'center', padding: '4rem 0' }}>
                <RefreshCw className="spin" size={32} style={{ color: 'var(--accent)', margin: '0 auto' }} />
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>Loading Admin Analytics...</div>
            </div>
        );
    }

    const { users, challenges, proofs, gameData } = analytics;

    // Calculate Active Users (7d)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];

    let activeCount = 0;
    users.forEach(u => {
        const gd = gameData[u.id] || {};
        if (gd.lastChallengeDate && gd.lastChallengeDate >= sevenDaysStr) activeCount++;
    });

    const totalChallenges = challenges.length;
    const totalProofs = proofs.length;
    const approvedProofs = proofs.filter(p => p.approved === true).length;
    const pendingProofs = proofs.filter(p => p.approved === null).length;
    const rejectedProofs = proofs.filter(p => p.approved === false).length;
    const escalatedProofs = proofs.filter(p => p.status === 'escalated' && p.approved === null).length;

    // Calculate platform revenue metrics (in test mode prices are ₹1, but calculation scales dynamically)
    const licenseRevenue = Object.values(gameData).filter(gd => gd.hasCreatorLicense).length * 1; 
    const vipRevenue = Object.values(gameData).filter(gd => gd.isVIP).length * 1; 
    const commissionRevenue = challenges.reduce((sum, c) => sum + (c.hasPrizePool ? (c.platformFee || (c.prizePool * 0.1)) : 0), 0);
    const totalPlatformRevenue = licenseRevenue + vipRevenue + commissionRevenue;

    // Categories counts
    const catCounts = {};
    challenges.forEach(c => {
        const key = c.category || 'uncategorized';
        catCounts[key] = (catCounts[key] || 0) + 1;
    });

    const getCategoryLabel = (cat) => {
        const labels = {
            fitness: 'Fitness',
            gaming: 'Gaming',
            food: 'Food',
            creative: 'Creative',
            entertainment: 'Entertainment',
            honor: 'Honor',
            social: 'Social',
            education: 'Education'
        };
        return labels[cat] || cat;
    };

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

    // Difficulties count
    const diffCounts = { easy: 0, medium: 0, hard: 0 };
    challenges.forEach(c => {
        const diff = c.difficulty || 'medium';
        if (diffCounts[diff] !== undefined) {
            diffCounts[diff]++;
        }
    });

    // Visibility count
    const publicCount = challenges.filter(c => c.visibility === 'public').length;
    const friendsCount = totalChallenges - publicCount;

    // Top Creators list
    const creatorCounts = {};
    challenges.forEach(c => {
        creatorCounts[c.creator] = (creatorCounts[c.creator] || 0) + 1;
    });

    const topCreators = Object.entries(creatorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([uid, count]) => {
            const user = users.find(u => u.id === uid);
            return user ? { ...user, challengeCount: count } : null;
        })
        .filter(Boolean);

    const sortedUsernames = [...users]
        .map(u => ({
            id: u.id,
            username: u.username || '(no username)',
            name: u.name || 'Unknown'
        }))
        .sort((a, b) => a.username.localeCompare(b.username));

    return (
        <div className="page" style={{ maxWidth: '1200px', paddingBottom: '3rem' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <div className="section-title">
                        Admin <span>Analytics</span>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '-0.75rem' }}>
                        Platform-wide insights and real-time activity metrics
                    </p>
                </div>
                <button className="btn btn-ghost" onClick={onClose}>
                    <ArrowLeft size={16} /> Back to App
                </button>
            </div>

            {/* Admin Stats row */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="admin-stat-icon" style={{ color: 'var(--neon)' }}><Users size={24} /></div>
                    <div className="admin-stat-val">{users.length}</div>
                    <div className="admin-stat-label">Total Users</div>
                </div>
                <div className="admin-stat-card">
                    <div className="admin-stat-icon" style={{ color: 'var(--green)' }}><Activity size={24} /></div>
                    <div className="admin-stat-val">{activeCount}</div>
                    <div className="admin-stat-label">Active (7d)</div>
                </div>
                <div className="admin-stat-card">
                    <div className="admin-stat-icon" style={{ color: 'var(--accent)' }}><Zap size={24} /></div>
                    <div className="admin-stat-val">{totalChallenges}</div>
                    <div className="admin-stat-label">Challenges</div>
                </div>
                <div className="admin-stat-card">
                    <div className="admin-stat-icon" style={{ color: 'var(--purple)' }}><Camera size={24} /></div>
                    <div className="admin-stat-val">{totalProofs}</div>
                    <div className="admin-stat-label">Proofs Submitted</div>
                </div>
                <div className="admin-stat-card" style={{ border: '1px solid rgba(255, 215, 0, 0.25)', background: 'rgba(255, 215, 0, 0.02)' }}>
                    <div className="admin-stat-icon" style={{ color: 'var(--gold)' }}><Coins size={24} /></div>
                    <div className="admin-stat-val" style={{ color: 'var(--gold)' }}>₹{totalPlatformRevenue.toFixed(2)}</div>
                    <div className="admin-stat-label" style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span>Platform Revenue</span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'none', fontWeight: 'normal' }}>
                            Commissions (₹{commissionRevenue.toFixed(1)}) · Subs (₹{vipRevenue + licenseRevenue})
                        </span>
                    </div>
                </div>
            </div>

            {/* Proof metrics progress bars */}
            <div className="admin-card">
                <div className="admin-card-title"><ShieldAlert size={18} /> Proof Verification Status</div>
                <div className="admin-bar-group">
                    <div className="admin-bar-item">
                        <div className="admin-bar-label"><span className="admin-dot" style={{ background: 'var(--green)' }}></span> Approved</div>
                        <div className="admin-bar-track">
                            <div className="admin-bar-fill" style={{ width: `${totalProofs ? (approvedProofs / totalProofs * 100) : 0}%`, background: 'var(--green)' }}></div>
                        </div>
                        <div className="admin-bar-val">{approvedProofs}</div>
                    </div>
                    <div className="admin-bar-item">
                        <div className="admin-bar-label"><span className="admin-dot" style={{ background: 'var(--gold)' }}></span> Pending</div>
                        <div className="admin-bar-track">
                            <div className="admin-bar-fill" style={{ width: `${totalProofs ? (pendingProofs / totalProofs * 100) : 0}%`, background: 'var(--gold)' }}></div>
                        </div>
                        <div className="admin-bar-val">{pendingProofs}</div>
                    </div>
                    <div className="admin-bar-item">
                        <div className="admin-bar-label"><span className="admin-dot" style={{ background: 'var(--accent)' }}></span> Rejected</div>
                        <div className="admin-bar-track">
                            <div className="admin-bar-fill" style={{ width: `${totalProofs ? (rejectedProofs / totalProofs * 100) : 0}%`, background: 'var(--accent)' }}></div>
                        </div>
                        <div className="admin-bar-val">{rejectedProofs}</div>
                    </div>
                    <div className="admin-bar-item">
                        <div className="admin-bar-label"><span className="admin-dot" style={{ background: 'var(--purple)' }}></span> Escalated</div>
                        <div className="admin-bar-track">
                            <div className="admin-bar-fill" style={{ width: `${totalProofs ? (escalatedProofs / totalProofs * 100) : 0}%`, background: 'var(--purple)' }}></div>
                        </div>
                        <div className="admin-bar-val">{escalatedProofs}</div>
                    </div>
                </div>
            </div>

            {/* Manual Payout Withdrawals Queue */}
            {(() => {
                const pendingWithdrawalsQueue = [];
                Object.entries(gameData).forEach(([uid, gd]) => {
                    const user = users.find(u => u.id === uid);
                    if (gd.withdrawals && Array.isArray(gd.withdrawals)) {
                        gd.withdrawals.forEach(w => {
                            if (w.status === 'pending') {
                                pendingWithdrawalsQueue.push({
                                    ...w,
                                    userId: uid,
                                    user: user || { name: 'Unknown User', username: 'unknown' }
                                });
                            }
                        });
                    }
                });

                return (
                    <div className="admin-card" style={{ border: '1px solid rgba(255, 183, 0, 0.2)' }}>
                        <div className="admin-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gold)' }}>
                                💸 Pending Cash Withdrawals Review ({pendingWithdrawalsQueue.length})
                            </span>
                        </div>
                        
                        {pendingWithdrawalsQueue.length === 0 ? (
                            <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '2rem 1rem', textAlign: 'center' }}>
                                No pending cash withdrawal requests to audit.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                                {pendingWithdrawalsQueue.map((req) => (
                                    <div 
                                        key={req.id} 
                                        style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Avatar user={req.user} size="sm" />
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                                    {req.user.name} <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 400 }}>@{req.user.username}</span>
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                                                    UPI VPA: <strong style={{ color: '#fff' }}>{req.upi}</strong> · Requested {new Date(req.timestamp).toLocaleString('en-GB')}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--neon)', fontFamily: 'var(--font-mono)' }}>
                                                    ₹{req.amount.toFixed(2)}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                                                    Net payout: ₹{(req.amount - 10).toFixed(2)} (₹10 processing fee)
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button 
                                                    className="btn btn-danger btn-xs" 
                                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
                                                    onClick={() => handleWithdrawalAction(req.userId, req.id, false)}
                                                >
                                                    Reject
                                                </button>
                                                <button 
                                                    className="btn btn-success btn-xs" 
                                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem', border: 'none', background: 'var(--green)', color: '#000', fontWeight: 700 }}
                                                    onClick={() => handleWithdrawalAction(req.userId, req.id, true)}
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Category and Difficulty columns */}
            <div className="admin-row">
                <div className="admin-card" style={{ flex: 1 }}>
                    <div className="admin-card-title"><BarChart2 size={18} /> Category Distribution</div>
                    <div className="admin-bar-group">
                        {Object.entries(catCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, cnt]) => (
                                <div key={cat} className="admin-bar-item">
                                    <div className="admin-bar-label" style={{ textTransform: 'capitalize' }}>
                                        {getCategoryIcon(cat)} {getCategoryLabel(cat)}
                                    </div>
                                    <div className="admin-bar-track">
                                        <div className="admin-bar-fill" style={{ width: `${totalChallenges ? (cnt / totalChallenges * 100) : 0}%` }}></div>
                                    </div>
                                    <div className="admin-bar-val">{cnt}</div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                <div className="admin-card" style={{ flex: 1 }}>
                    <div className="admin-card-title"><Shield size={18} /> Difficulty Split</div>
                    <div className="admin-bar-group">
                        <div className="admin-bar-item">
                            <div className="admin-bar-label"><span className="badge diff-easy">Easy</span></div>
                            <div className="admin-bar-track">
                                <div className="admin-bar-fill" style={{ width: `${totalChallenges ? (diffCounts.easy / totalChallenges * 100) : 0}%`, background: 'var(--green)' }}></div>
                            </div>
                            <div className="admin-bar-val">{diffCounts.easy}</div>
                        </div>
                        <div className="admin-bar-item">
                            <div className="admin-bar-label"><span className="badge diff-medium">Medium</span></div>
                            <div className="admin-bar-track">
                                <div className="admin-bar-fill" style={{ width: `${totalChallenges ? (diffCounts.medium / totalChallenges * 100) : 0}%`, background: 'var(--gold)' }}></div>
                            </div>
                            <div className="admin-bar-val">{diffCounts.medium}</div>
                        </div>
                        <div className="admin-bar-item">
                            <div className="admin-bar-label"><span className="badge diff-hard">Hard</span></div>
                            <div className="admin-bar-track">
                                <div className="admin-bar-fill" style={{ width: `${totalChallenges ? (diffCounts.hard / totalChallenges * 100) : 0}%`, background: 'var(--accent)' }}></div>
                            </div>
                            <div className="admin-bar-val">{diffCounts.hard}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visibility and Username columns */}
            <div className="admin-row">
                <div className="admin-card" style={{ flex: 1 }}>
                    <div className="admin-card-title"><Globe size={18} /> Visibility Split</div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div className="admin-mini-stat">
                            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--purple)' }}>{publicCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Public</div>
                        </div>
                        <div className="admin-mini-stat">
                            <div style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--neon)' }}>{friendsCount}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Friends Only</div>
                        </div>
                    </div>
                </div>

                <div className="admin-card" style={{ flex: 1.5, minWidth: '320px' }}>
                    <div className="admin-card-title" style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ShieldAlert size={18} /> Safety Auditing & Moderation Panel
                    </div>
                    
                    {(() => {
                        const handleForgiveStrike = async (userId, currentStrikes) => {
                            const newCount = Math.max(0, currentStrikes - 1);
                            await DB.adminUpdateUserSafety(userId, {
                                strikesCount: newCount,
                                banUntil: null // Lift ban on strike forgiveness
                            });
                        };

                        const handleAddStrike = async (userId) => {
                            await DB.addStrikeToUser(userId);
                        };

                        const handleTerminate = async (userId) => {
                            if (!window.confirm("Are you sure you want to TERMINATE this account? The user will be locked out permanently.")) return;
                            await DB.adminUpdateUserSafety(userId, {
                                isTerminated: true
                            });
                        };

                        const handleReactivate = async (userId) => {
                            await DB.adminUpdateUserSafety(userId, {
                                strikesCount: 0,
                                banUntil: null,
                                isTerminated: false
                            });
                        };

                        return (
                            <div className="admin-users-box" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                {users.length > 0 ? (
                                    users.map(u => {
                                        const gd = gameData[u.id] || {};
                                        const strikes = gd.strikesCount || 0;
                                        const isTerminated = gd.isTerminated || false;
                                        const isBanned = gd.banUntil && new Date(gd.banUntil) > new Date();
                                        
                                        let safetyStatus = <span style={{ color: 'var(--green)', fontSize: '0.72rem', fontWeight: 700 }}>✓ ACTIVE</span>;
                                        if (isTerminated) {
                                            safetyStatus = <span style={{ color: 'var(--red)', fontSize: '0.72rem', fontWeight: 700 }}>❌ TERMINATED</span>;
                                        } else if (isBanned) {
                                            safetyStatus = <span style={{ color: 'var(--gold)', fontSize: '0.72rem', fontWeight: 700 }}>⏳ BANNED</span>;
                                        }

                                        return (
                                            <div key={u.id} className="admin-user-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Avatar user={u} size="sm" />
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{u.name || 'User'}</div>
                                                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>@{u.username}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                                                        {safetyStatus}
                                                        <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Strikes: {strikes}</span>
                                                    </div>
                                                </div>
                                                
                                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                                    {isTerminated || isBanned ? (
                                                        <button 
                                                            className="btn btn-success btn-xs" 
                                                            style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'var(--green)', color: '#000', border: 'none', margin: 0 }}
                                                            onClick={() => handleReactivate(u.id)}
                                                        >
                                                            Reactivate / Unban
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button 
                                                                className="btn btn-danger btn-xs" 
                                                                style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'var(--accent)', border: 'none', margin: 0 }}
                                                                onClick={() => handleAddStrike(u.id)}
                                                            >
                                                                Add Strike
                                                            </button>
                                                            <button 
                                                                className="btn btn-danger btn-xs" 
                                                                style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: '#ff3333', border: 'none', color: '#fff', margin: 0 }}
                                                                onClick={() => handleTerminate(u.id)}
                                                            >
                                                                Terminate
                                                            </button>
                                                        </>
                                                    )}
                                                    {strikes > 0 && (
                                                        <button 
                                                            className="btn btn-ghost btn-xs" 
                                                            style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderColor: 'rgba(255,255,255,0.1)', margin: 0 }}
                                                            onClick={() => handleForgiveStrike(u.id, strikes)}
                                                        >
                                                            Forgive Strike
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>No users registered</div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Top Creators widget */}
            <div className="admin-card">
                <div className="admin-card-title">🏆 Top Creators</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {topCreators.length > 0 ? (
                        topCreators.map((u, i) => (
                            <div key={u.id} className="admin-creator-row">
                                <span className="admin-creator-rank" style={{ color: i < 3 ? ['var(--gold)', 'var(--silver)', 'var(--bronze)'][i] : 'var(--muted)' }}>
                                    #{i + 1}
                                </span>
                                <Avatar user={u} size="sm" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{u.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>@{u.username}</div>
                                </div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--neon)', fontWeight: 700 }}>
                                    {u.challengeCount} dares
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>No challenges published yet</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
