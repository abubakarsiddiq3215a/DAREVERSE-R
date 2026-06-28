import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon as Sparkles, MessageSquareIcon as MessageSquare, Trash2Icon as Trash2, ShieldIcon as Shield, EyeIcon as Eye, ClockIcon as Clock, CalendarIcon as Calendar, CheckCircleIcon as CheckCircle, VideoIcon as Video, CameraIcon as Camera, GlobeIcon as Globe, LockIcon as Lock, Share2Icon as Share2, HelpCircleIcon as HelpCircle, ZapIcon as Zap, XCircleIcon as XCircle, InboxIcon as Inbox, UsersIcon as Users, DumbbellIcon as Dumbbell, Gamepad2Icon as Gamepad2, UtensilsIcon as Utensils, PaletteIcon as Palette, TheaterIcon as Theater, BookOpenIcon as BookOpen } from '../components/Icons';
import { DB } from '../services/db';
import { Gamification } from '../services/gamification';
import { useToast } from '../components/Toast';
import Avatar from '../components/Avatar';
import gsap from 'gsap';

export const CountdownTimer = ({ deadline }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!deadline) return;

        const calculateTime = () => {
            const difference = new Date(deadline) - new Date();
            if (difference <= 0) {
                setTimeLeft('Expired');
                return;
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((difference / 1000 / 60) % 60);
            const seconds = Math.floor((difference / 1000) % 60);

            let str = '';
            if (days > 0) str += `${days}d `;
            str += `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
            setTimeLeft(str);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [deadline]);

    if (!deadline) return null;

    const isExpired = timeLeft === 'Expired';
    return (
        <span className={`badge ${isExpired ? 'badge-red' : 'badge-gold'}`} style={{ fontFamily: 'var(--font-mono)' }}>
            ⏰ {isExpired ? 'Expired' : timeLeft}
        </span>
    );
};

export const Feed = ({ 

    me, 
    onOpenCreateChallenge, 
    onOpenSubmitProof, 
    onOpenViewProof, 
    onOpenVerifyProof,
    onOpenVoteProof,
    challenges = [], 
    users = [],
    friends = [],
    proofs = [],
    onRefreshData
}) => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState('all');
    const containerRef = useRef(null);

    // Injects a sponsored/campaign dummy challenge card at every 7th element (6, 13, 20...)
    const getItemsWithSponsored = (rawItems) => {
        const result = [];
        rawItems.forEach((item, index) => {
            result.push(item);
            if ((index + 1) % 6 === 0) {
                result.push({
                    id: `sponsored-ad-${index}`,
                    isSponsoredAd: true,
                    name: '🔥 PEPSI BLACK CAMPAIGN',
                    desc: 'Take a refreshing sip of Pepsi Black. Film yourself describing the bold taste in one word. Share your proof!',
                    category: 'social',
                    difficulty: 'easy',
                    hasPrizePool: true,
                    prizePool: 5000,
                    winnersLimit: 10,
                    creator: 'Pepsi Co.',
                    brandAd: true,
                    doubleXP: true
                });
            }
        });
        return result;
    };

    // Map user list to map by ID for fast lookup
    const userMap = {};
    users.forEach(u => {
        userMap[u.id] = u;
    });

    // Filter feed items
    const getFilteredItems = () => {
        if (activeTab === 'all') {
            return challenges.filter(c => {
                if (c.creator === me.id) return true;
                if ((c.targets || []).includes(me.id)) return true;
                if (c.isPublic || c.visibility === 'public') return true;
                if (friends.includes(c.creator)) return true;
                return false;
            }).slice(0, 40);
        } else if (activeTab === 'public') {
            return challenges.filter(c => c.isPublic || c.visibility === 'public');
        } else if (activeTab === 'sent') {
            return challenges.filter(c => c.creator !== me.id && (c.targets || []).includes(me.id));
        } else {
            return challenges.filter(c => c.creator === me.id);
        }
    };

    const items = getFilteredItems();

    // GSAP staggered entry whenever the tab updates
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
                        duration: 0.45, 
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

    // Category mappings
    const getCategoryIcon = (cat) => {
        switch (cat) {
            case 'fitness': return <Dumbbell />;
            case 'gaming': return <Gamepad2 />;
            case 'food': return <Utensils />;
            case 'creative': return <Palette />;
            case 'entertainment': return <Theater />;
            case 'honor': return <Shield />;
            case 'social': return <Users />;
            case 'education': return <BookOpen />;
            default: return <Sparkles />;
        }
    };

    const handleWhatsAppShare = async (e, c) => {
        e.stopPropagation();
        
        // WhatsApp link builder
        const rawName = me.name || 'A DareVerse player';
        const playerName = rawName.startsWith('@') ? rawName : `@${rawName}`;
        const text = `*DareVerse Challenge*\n\n*${c.name}*\n${c.desc}\n\nShared by: ${playerName}\nThink you can do it? Join DareVerse and prove yourself.\n${window.location.origin}`;
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        
        // Scale animate button snap
        const btn = e.currentTarget;
        gsap.to(btn, { scale: 0.85, duration: 0.1, yoyo: true, repeat: 1 });
        
        window.open(url, '_blank');
        
        // Award XP
        await Gamification.awardShare(me.id);
        onRefreshData();
    };

    const handleConfirmIDare = (e, c) => {
        e.stopPropagation();
        
        // Trigger visual "electric snap" card boundary highlights
        const card = e.currentTarget.closest('.challenge-card');
        if (card) {
            card.classList.add('electric-snap-active');
            setTimeout(() => card.classList.remove('electric-snap-active'), 500);
        }

        // Auto-approve public challenge acceptance
        onOpenSubmitProof(c, 'confirm');
    };

    const handleDeleteChallenge = async (e, c) => {
        e.stopPropagation();
        if (window.confirm(`Delete challenge "${c.name}" permanently?`)) {
            try {
                await DB.deleteChallenge(c.id);
                showToast('Challenge deleted', 'success');
                onRefreshData();
            } catch (err) {
                console.error('Delete failed:', err);
            }
        }
    };

    const getDeadlineBadge = (c) => {
        if (!c.deadline) return null;
        const today = new Date();
        const dl = new Date(c.deadline);
        const diff = Math.ceil((dl - today) / 86400000);
        const formatted = dl.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        if (diff < 0) {
            return <span className="badge badge-red"><Clock size={11} /> Expired {formatted}</span>;
        } else if (diff === 0) {
            return <span className="badge badge-red"><Clock size={11} /> Due Today</span>;
        } else if (diff <= 3) {
            return <span className="badge badge-gold"><Clock size={11} /> {diff}d left</span>;
        }
        return <span className="badge badge-blue"><Clock size={11} /> Due {formatted}</span>;
    };

    return (
        <div className="page" id="page-feed">
            <div className="page-header">
                <div>
                    <div className="section-title">
                        Hey <span>{me?.name ? me.name.split(' ')[0] : 'Player'}</span>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '-0.75rem' }}>
                        What challenge will you conquer today?
                    </p>
                </div>
                <button className="btn btn-primary" onClick={onOpenCreateChallenge}>
                    <PlusIcon /> Create Challenge
                </button>
            </div>

            {/* Stats row */}
            <div className="grid-3 stat-row-mobile" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-val">{me?.totalCompleted || 0}</div>
                    <div className="stat-label">DARES CONQUERED</div>
                </div>
                <div className="stat-card">
                    <div className="stat-val">{me?.totalCreated || 0}</div>
                    <div className="stat-label">CHALLENGES CREATED</div>
                </div>
                <div className="stat-card">
                    <div className="stat-val" style={{ color: 'var(--neon)' }}>{friends.length}</div>
                    <div className="stat-label">FRIENDS CIRCLE</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="tabs" style={{ marginBottom: '1.25rem', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <button 
                    className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    All Activity
                </button>
                <button 
                    className={`tab ${activeTab === 'public' ? 'active' : ''}`}
                    onClick={() => setActiveTab('public')}
                >
                    Public Dares
                </button>
                <button 
                    className={`tab ${activeTab === 'reels' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reels')}
                >
                    🎥 Vertical Reels
                </button>
                <button 
                    className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sent')}
                >
                    Sent to You
                </button>
                <button 
                    className={`tab ${activeTab === 'mine' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mine')}
                >
                    Your Challenges
                </button>
            </div>

            {/* Reels vertical viewport overlay */}
            {activeTab === 'reels' ? (() => {
                const videoProofs = proofs.filter(p => p.fileType === 'video' && p.fileUrl);
                const reelsList = videoProofs.length > 0 ? videoProofs : [
                    {
                        id: 'demo-reel-1',
                        fileUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-holding-dumbbells-in-gym-34335-large.mp4',
                        fromId: me.id,
                        note: '100 reps challenge crushed! 🏋️',
                        date: new Date().toISOString(),
                        chalId: challenges[0]?.id || 'demo-chal'
                    },
                    {
                        id: 'demo-reel-2',
                        fileUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-running-on-treadmill-34351-large.mp4',
                        fromId: me.id,
                        note: 'Morning sprint challenge completed. +150 XP!',
                        date: new Date().toISOString(),
                        chalId: challenges[1]?.id || 'demo-chal'
                    }
                ];

                return (
                    <div className="reels-feed-container" style={{ gridColumn: '1/-1' }}>
                        {reelsList.map((p, idx) => {
                            const submitter = userMap[p.fromId] || me;
                            const chal = challenges.find(c => c.id === p.chalId) || {
                                name: 'Super Fitness Dare',
                                desc: 'Perform 100 consecutive dumbbell reps with good posture.'
                            };

                            return (
                                <div key={p.id} className="reel-item">
                                    <video 
                                        className="reel-video" 
                                        src={p.fileUrl} 
                                        autoPlay 
                                        loop 
                                        muted 
                                        playsInline
                                    />
                                    <div className="reel-overlay">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="badge badge-purple" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                🎥 Dare Reel
                                            </span>
                                        </div>
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                                            <div style={{ flex: 1, paddingRight: '1rem', color: '#fff' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <Avatar user={submitter} size="sm" />
                                                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>@{submitter.username || 'player'}</span>
                                                </div>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.25rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{chal.name}</h4>
                                                <p style={{ fontSize: '0.8rem', color: '#ccc', lineHeight: 1.4, margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{p.note}</p>
                                            </div>

                                            <div className="reel-overlay-interactive" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                                <button 
                                                    className="btn btn-primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleConfirmIDare(e, chal);
                                                    }}
                                                    style={{ background: 'var(--accent)', boxShadow: '0 0 15px var(--accent)', padding: '0.8rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', borderRadius: '12px' }}
                                                >
                                                    <Zap size={18} />
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 900 }}>DO THIS DARE</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })() : (
                /* Challenges scrolling list */
                <div ref={containerRef} className="grid-auto" style={{ gridColumn: '1/-1' }}>
                    {items.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)' }}>
                            <HelpCircle size={40} style={{ margin: '0 auto 0.75rem' }} />
                            <div style={{ fontSize: '0.9rem' }}>No challenges here yet</div>
                        </div>
                    ) : (
                        getItemsWithSponsored(items).map(c => {
                            if (c.isSponsoredAd) {
                                return (
                                    <div key={c.id} className="challenge-card sponsored-card" style={{ border: '2px solid var(--accent2)', boxShadow: '0 0 15px rgba(255, 106, 0, 0.25)', background: 'linear-gradient(135deg, rgba(6, 6, 12, 0.95), rgba(255, 106, 0, 0.05))', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '300px' }}>
                                        <div className="card-header" style={{ alignItems: 'center' }}>
                                            <div className="challenge-icon" style={{ background: 'var(--accent2)', color: '#fff', fontSize: '1rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                                                📢
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="challenge-title" style={{ fontSize: '1.1rem', marginBottom: '0.15rem', color: 'var(--accent2)', fontWeight: 800 }}>{c.name}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                                                    SPONSORED DARE · CAMPAIGN
                                                </div>
                                            </div>
                                        </div>
                                        <div className="card-body" style={{ paddingTop: '0.85rem', paddingBottom: '0.85rem', flex: 1 }}>
                                            <div className="challenge-desc" style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>{c.desc}</div>
                                            <div className="card-badges-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                                <span className="badge badge-purple" style={{ background: 'var(--accent2)', color: '#fff', border: 'none' }}>⭐ DOUBLE XP DARE</span>
                                                <span className="badge badge-gold">💰 ₹{c.prizePool} pool</span>
                                                <span className="badge diff-easy">Easy</span>
                                            </div>
                                        </div>
                                        <div className="card-footer" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Sponsored by Pepsi</span>
                                            <button 
                                                className="btn btn-primary btn-xs"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    showToast("Opening sponsored campaign...", "info");
                                                }}
                                                style={{ background: 'var(--accent2)', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                                            >
                                                Participate Now
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

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
                                        onClick={(e) => handleConfirmIDare(e, c)}
                                    >
                                        <Zap size={13} /> I Dare
                                    </button>
                                );
                            } else if (myStatus === 'accepted') {
                                actionBtn = (
                                    <button 
                                        className="btn btn-primary btn-sm" 
                                        onClick={() => onOpenSubmitProof(c, 'submit')}
                                    >
                                        <UploadIcon /> Submit Proof
                                    </button>
                                );
                            } else if (myStatus === 'completed' || myStatus === 'approved') {
                                actionBtn = (
                                    <button 
                                        className="btn btn-success btn-sm" 
                                        onClick={() => onOpenViewProof(c)}
                                    >
                                        <Eye size={13} /> View Proof
                                    </button>
                                );
                            } else if (isExpired) {
                                actionBtn = <span className="badge badge-red"><XCircle size={11} /> Expired</span>;
                            }
                        } else if (!isMyChallenge && isPublic && !amITarget) {
                            actionBtn = (
                                <button 
                                    className="btn btn-primary btn-sm" 
                                    onClick={(e) => handleConfirmIDare(e, c)}
                                >
                                    <Zap size={13} /> I Dare
                                </button>
                            );
                        } else if (isMyChallenge) {
                            const pendingForMe = proofs.filter(p => p.chalId === c.id && p.approved === null && p.fromId !== me.id);
                            if (pendingForMe.length > 0) {
                                actionBtn = (
                                    <button 
                                        className="btn btn-warn btn-sm" 
                                        onClick={() => onOpenVerifyProof(pendingForMe[0], c)}
                                    >
                                        <Inbox size={13} /> {pendingForMe.length} New
                                    </button>
                                );
                            }
                        }

                        const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
                        const targetUsers = targets.map(id => userMap[id]).filter(Boolean);

                        return (
                            <div key={c.id} className={`challenge-card${isExpired ? ' expired' : ''}`}>
                                <div className="card-header" style={{ alignItems: 'center' }}>
                                    <div className="challenge-icon">
                                        {getCategoryIcon(c.category)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="challenge-title" style={{ fontSize: '1.1rem', marginBottom: '0.15rem' }}>{c.name || 'Untitled'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                            by <strong style={{ color: 'var(--text)' }}>{creator ? (isMyChallenge ? 'You' : creator.name) : 'Player'}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body" style={{ paddingTop: '0.85rem', paddingBottom: '0.85rem' }}>
                                    <div className="challenge-desc" style={{ marginBottom: '0.75rem' }}>{c.desc}</div>
                                    
                                    <div className="card-badges-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                        {isPublic ? (
                                            <span className="badge badge-purple"><Globe size={11} /> Public</span>
                                        ) : (
                                            <span className="badge badge-blue"><Lock size={11} /> Friends</span>
                                        )}
                                        {c.isHonor && <span className="badge badge-gold"><Shield size={11} /> Honor</span>}
                                        {c.hasPrizePool && (
                                            <span className="badge badge-gold" style={{ border: '1px solid rgba(255, 214, 0, 0.3)', boxShadow: '0 0 8px rgba(255, 214, 0, 0.2)' }}>
                                                💰 ₹{c.prizePool} pool ({c.winnersLimit || 5} { (c.winnersLimit || 5) === 1 ? 'winner' : 'winners' })
                                            </span>
                                        )}
                                        {c.proofType === 'video' ? (
                                            <span className="badge badge-blue"><Video size={11} /> Video</span>
                                        ) : c.proofType === 'image' ? (
                                            <span className="badge badge-blue"><Camera size={11} /> Image</span>
                                        ) : (
                                            <span className="badge badge-blue"><Camera size={11} /> / <Video size={11} /></span>
                                        )}
                                        <span className={`badge diff-${c.difficulty || 'medium'}`}>{c.difficulty}</span>
                                        <CountdownTimer deadline={c.deadline} />
                                    </div>

                                    {isPublic ? (
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <Users size={12} /> <strong style={{ color: 'var(--text)' }}>{acceptedCount}</strong> accepted
                                            </span>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <CheckCircle size={12} /> <strong style={{ color: 'var(--green)' }}>{completedCount}</strong> completed
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifySpaceBetween: 'space-between', marginBottom: '0.35rem' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Completion progress</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text)', fontWeight: 600, marginLeft: 'auto' }}>
                                                    {completedCount}/{total} completed
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
                                                {targetUsers.slice(0, 4).map(t => (
                                                    <Avatar key={t.id} user={t} isMe={t.id === me.id} size="sm" />
                                                ))}
                                                {targetUsers.length > 4 && (
                                                    <div className="avatar sm" style={{ background: 'var(--bg-solid)', color: 'var(--muted)' }}>
                                                        +{targetUsers.length - 4}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="card-actions" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginLeft: 'auto' }}>
                                        {actionBtn}
                                        <button 
                                            className="btn-whatsapp" 
                                            onClick={(e) => handleWhatsAppShare(e, c)}
                                            title="Share on WhatsApp"
                                            style={{ padding: '0.45rem' }}
                                        >
                                            <Share2 size={13} />
                                        </button>
                                        {isMyChallenge && (
                                            <button 
                                                className="btn btn-danger btn-xs" 
                                                onClick={(e) => handleDeleteChallenge(e, c)}
                                                title="Delete Challenge"
                                                style={{ padding: '0.45rem' }}
                                            >
                                                <Trash2 size={13} />
                                            </button>
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

// Internal icon vectors
const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const UploadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
);

export default Feed;
