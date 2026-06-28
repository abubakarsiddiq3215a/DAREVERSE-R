import React, { useState, useEffect, useRef } from 'react';
import { TrophyIcon as Trophy, MedalIcon as Medal, SearchIcon as Search, SparklesIcon as Sparkles, HelpCircleIcon as HelpCircle, CrownIcon as Crown } from '../components/Icons';
import Avatar from '../components/Avatar';
import { DB } from '../services/db';
import { Gamification } from '../services/gamification';
import gsap from 'gsap';

export const Leaderboard = ({ 
    me, 
    users = [], 
    friendsIds = [], 
    onRefreshData 
}) => {
    const [activeTab, setActiveTab] = useState('friends');
    const [scoreboard, setScoreboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [amIVIP, setAmIVIP] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const fetchScores = async () => {
            setLoading(true);
            try {
                // Fetch all gamification documents
                const gameMap = await DB.getAllGameData();
                
                // Construct items
                const list = users.map(u => {
                    const g = gameMap[u.id] || { rankPoints: 0, isVIP: false, totalEarnings: 0 };
                    return {
                        ...u,
                        rankPoints: g.rankPoints || 0,
                        isVIP: g.isVIP || false,
                        totalEarnings: g.totalEarnings || 0
                    };
                });

                // Track my VIP status
                const myGame = gameMap[me.id] || {};
                setAmIVIP(myGame.isVIP || false);

                // Filter by tab
                let filteredList = [];
                if (activeTab === 'friends') {
                    // Include me and my friends
                    filteredList = list.filter(u => u.id === me.id || friendsIds.includes(u.id));
                } else {
                    filteredList = list;
                }

                // Sort descending
                filteredList.sort((a, b) => b.rankPoints - a.rankPoints);
                setScoreboard(filteredList);
            } catch (err) {
                console.error('Failed to load scoreboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchScores();
    }, [activeTab, users, friendsIds, me]);

    // GSAP staggered entry for rows
    useEffect(() => {
        if (!loading && containerRef.current) {
            const rows = containerRef.current.querySelectorAll('.lb-row');
            if (rows.length > 0) {
                gsap.killTweensOf(rows);
                gsap.fromTo(rows,
                    { opacity: 0, x: -15 },
                    { 
                        opacity: 1, 
                        x: 0, 
                        duration: 0.35, 
                        stagger: 0.03, 
                        ease: 'power2.out' 
                    }
                );
            }
        }
    }, [loading, scoreboard]);

    const getRankIcon = (rankIdx) => {
        const rank = rankIdx + 1;
        if (rank === 1) {
            return <Trophy size={20} style={{ color: 'var(--gold)' }} />;
        } else if (rank === 2) {
            return <Medal size={20} style={{ color: 'var(--silver)' }} />;
        } else if (rank === 3) {
            return <Medal size={20} style={{ color: 'var(--bronze)' }} />;
        }
        return <span style={{ color: 'var(--muted)' }}>#{rank}</span>;
    };

    return (
        <div className="page" id="page-leaderboard">
            <div className="section-title">
                <span>Scoreboard</span>
            </div>

            {/* Sub Tabs */}
            <div className="tabs" style={{ marginBottom: '1.25rem' }}>
                <button 
                    className={`tab ${activeTab === 'friends' ? 'active' : ''}`}
                    onClick={() => setActiveTab('friends')}
                >
                    Friends Circle
                </button>
                <button 
                    className={`tab ${activeTab === 'global' ? 'active' : ''}`}
                    onClick={() => setActiveTab('global')}
                >
                    Global Standings
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                    <div className="avatar me" style={{ animation: 'pulse 1.5s infinite', margin: '0 auto' }}>🏆</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Recalculating standings...</div>
                </div>
            ) : (
                <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {scoreboard.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                            <HelpCircle size={40} style={{ margin: '0 auto 0.75rem' }} />
                            <div style={{ fontSize: '0.9rem' }}>No rankings logged yet</div>
                        </div>
                    ) : (
                        scoreboard.map((u, idx) => {
                            const isMe = u.id === me.id;
                            const rankDetail = Gamification.getRank(u.rankPoints);
                            
                            return (
                                <div 
                                    key={u.id} 
                                    className={`lb-row ${isMe ? 'is-me' : ''}`}
                                    style={{ border: isMe ? '1px solid rgba(255,0,85,0.2)' : '1px solid transparent' }}
                                >
                                    <div className="lb-rank">
                                        {getRankIcon(idx)}
                                    </div>
                                    <Avatar user={u} isMe={isMe} size="sm" />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div className="lb-name" style={{ fontWeight: isMe ? 700 : 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            {u.name} 
                                            {isMe && <span style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>(You)</span>}
                                            {u.isVIP && (
                                                <span title="VIP Member" style={{ color: 'var(--gold)', display: 'inline-flex', alignItems: 'center' }}>
                                                    <Crown size={13} fill="var(--gold)" />
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.1rem', textTransform: 'capitalize' }}>
                                            {rankDetail.name}
                                        </div>
                                    </div>
                                    <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                                        <div className="lb-score" style={{ margin: 0 }}>
                                            {u.rankPoints.toLocaleString()} XP
                                        </div>
                                        <div style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            {amIVIP ? (
                                                <span style={{ color: 'var(--neon)' }} title="Career Payouts">👁️ ₹{(u.totalEarnings || 0).toFixed(2)}</span>
                                            ) : (
                                                <span style={{ color: 'var(--muted)' }} title="Unlock VIP to view user earnings">🔒 Spy Power</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
