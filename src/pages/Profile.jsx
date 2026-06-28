import React, { useState, useEffect, useRef } from 'react';
import { AwardIcon as Award, ZapIcon as Zap, FlameIcon as Flame, CalendarIcon as Calendar, CameraIcon as Camera, ShieldIcon as Shield, StarIcon as Star, RefreshIcon as RefreshCw, LayersIcon as Layers, LockIcon as Lock, TrophyIcon as Trophy, UsersIcon as Users, PlusIcon as Plus, MegaphoneIcon as Megaphone, CheckCircleIcon as CheckCircle, CrownIcon as Crown, LogOutIcon as LogOut } from '../components/Icons';
import Avatar from '../components/Avatar';
import { DB } from '../services/db';
import { Auth } from '../services/auth';
import { Cloudinary } from '../services/upload';
import { Gamification } from '../services/gamification';
import { useToast } from '../components/Toast';
import gsap from 'gsap';

export const Profile = ({ me, challenges = [], onRefreshData, onTriggerPayment }) => {
    const { showToast } = useToast();
    const [gameData, setGameData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);
    const containerRef = useRef(null);

    // Wallet states
    const [withdrawUpi, setWithdrawUpi] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState('upi'); // 'upi' | 'bank'
    const [bankAccount, setBankAccount] = useState('');
    const [bankIfsc, setBankIfsc] = useState('');
    const [bankName, setBankName] = useState('');

    // Physical Trophies states
    const [bypassRequirements, setBypassRequirements] = useState(false);
    const [claimModalOpen, setClaimModalOpen] = useState(false);
    const [activeTrophyClaim, setActiveTrophyClaim] = useState(null);
    const [claimName, setClaimName] = useState('');
    const [claimAddress, setClaimAddress] = useState('');
    const [claimPhone, setClaimPhone] = useState('');
    const [claimEngraving, setClaimEngraving] = useState('');

    // Fetch gamification profile
    const fetchProfileData = async () => {
        setLoading(true);
        try {
            const data = await DB.getGameData(me.id);
            setGameData(data);
        } catch (err) {
            console.error('Failed to load profile details:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, [me]);

    // GSAP entrance slide
    useEffect(() => {
        if (!loading && containerRef.current) {
            const elements = containerRef.current.querySelectorAll('.card, .streak-box, .badge-card, .trophy-card, .portfolio-card');
            if (elements.length > 0) {
                gsap.fromTo(elements,
                    { opacity: 0, y: 12 },
                    { opacity: 1, y: 0, duration: 0.45, stagger: 0.02, ease: 'power2.out' }
                );
            }
        }
    }, [loading]);

    const handleAvatarClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingAvatar(true);
        showToast('Uploading avatar...', 'info');

        try {
            const url = await Cloudinary.uploadAvatar(file);
            
            // Save in users document
            await DB.updateUserProfile(me.id, { profileImage: url });
            
            // Sync profiles
            await DB.syncMyProfile(me.id);
            
            showToast('Avatar updated!', 'success');
            onRefreshData();
            fetchProfileData();
        } catch (err) {
            console.error('Avatar change failed:', err);
            showToast('Avatar upload failed', 'error');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleBuyVIP = () => {
        if (!onTriggerPayment) return;
        onTriggerPayment(5, 'VIP Monthly Subscription (1 Month)', async () => {
            try {
                const updated = { ...gameData, isVIP: true };
                await DB.saveGameData(me.id, updated);
                setGameData(updated);
                showToast('VIP status unlocked! Welcome to the elite.', 'success');
                if (onRefreshData) onRefreshData();
            } catch (err) {
                console.error(err);
                showToast('Failed to activate VIP', 'error');
            }
        });
    };

    const handleBuyLicense = () => {
        if (!onTriggerPayment) return;
        onTriggerPayment(10, 'Creator License (Instant Unlock)', async () => {
            try {
                const updated = { ...gameData, hasCreatorLicense: true };
                await DB.saveGameData(me.id, updated);
                setGameData(updated);
                showToast('Creator License unlocked! Host challenges immediately.', 'success');
                if (onRefreshData) onRefreshData();
            } catch (err) {
                console.error(err);
                showToast('Failed to activate Creator License', 'error');
            }
        });
    };

    const handleWithdrawSubmit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(withdrawAmount);
        if (isNaN(amount) || amount < 100) {
            showToast('Minimum withdrawal is ₹100', 'error');
            return;
        }
        if (withdrawMethod === 'upi' && !withdrawUpi.trim()) {
            showToast('Please enter a valid UPI ID', 'error');
            return;
        }
        if (withdrawMethod === 'bank') {
            if (!bankAccount.trim() || !bankIfsc.trim() || !bankName.trim()) {
                showToast('Please fill out all bank account details', 'error');
                return;
            }
        }
        if ((gameData.balance || 0) < amount) {
            showToast(`Insufficient balance. Available: ₹${(gameData.balance || 0).toFixed(2)}`, 'error');
            return;
        }

        try {
            const newWithdrawal = {
                id: 'w' + Date.now() + Math.random().toString(36).substr(2, 4),
                amount: amount,
                fee: 10,
                netAmount: amount - 10,
                method: withdrawMethod,
                upi: withdrawMethod === 'upi' ? withdrawUpi.trim() : null,
                bankAccount: withdrawMethod === 'bank' ? bankAccount.trim() : null,
                bankIfsc: withdrawMethod === 'bank' ? bankIfsc.trim() : null,
                bankName: withdrawMethod === 'bank' ? bankName.trim() : null,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };

            const updated = {
                ...gameData,
                balance: parseFloat(((gameData.balance || 0) - amount).toFixed(2)),
                withdrawals: [newWithdrawal, ...(gameData.withdrawals || [])]
            };

            await DB.saveGameData(me.id, updated);
            setGameData(updated);
            setWithdrawAmount('');
            setWithdrawUpi('');
            setBankAccount('');
            setBankIfsc('');
            setBankName('');
            showToast(`Withdrawal request of ₹${amount} submitted!`, 'success');
            if (onRefreshData) onRefreshData();
        } catch (err) {
            console.error(err);
            showToast('Withdrawal request failed', 'error');
        }
    };

    const handleLogoutClick = async () => {
        try {
            await Auth.logout();
            showToast('Logged out successfully', 'success');
        } catch (err) {
            console.error('Logout error:', err);
            showToast('Failed to log out', 'error');
        }
    };

    const handleClaimClick = (trophy) => {
        setActiveTrophyClaim(trophy);
        setClaimName(me.name || '');
        setClaimAddress('');
        setClaimPhone('');
        setClaimEngraving(me.name || '');
        setClaimModalOpen(true);
    };

    const handleClaimSubmit = async (e) => {
        e.preventDefault();
        if (!claimName.trim() || !claimAddress.trim() || !claimPhone.trim() || !claimEngraving.trim()) {
            showToast('Please fill out all shipping details', 'error');
            return;
        }

        try {
            const claimedTrophies = gameData.claimedTrophies || [];
            const key = activeTrophyClaim.key;
            if (claimedTrophies.includes(key)) {
                showToast('Trophy already claimed!', 'error');
                return;
            }

            const updated = {
                ...gameData,
                claimedTrophies: [...claimedTrophies, key]
            };

            await DB.saveGameData(me.id, updated);
            setGameData(updated);
            setClaimModalOpen(false);
            showToast(`Physical trophy claimed! Shipped FREE to your address.`, 'success');
            if (onRefreshData) onRefreshData();
        } catch (err) {
            console.error(err);
            showToast('Claim submission failed', 'error');
        }
    };

    // 3D Tilt Card effect handler
    const handleMouseMove = (e, cardEl) => {
        if (!cardEl) return;
        const rect = cardEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateY = ((x - centerX) / centerX) * 15;
        const rotateX = -((y - centerY) / centerY) * 15;

        gsap.to(cardEl, {
            rotateY: rotateY,
            rotateX: rotateX,
            transformPerspective: 1000,
            scale: 1.04,
            duration: 0.3,
            ease: 'power2.out',
            overwrite: 'auto'
        });
    };

    const handleMouseLeave = (cardEl) => {
        if (!cardEl) return;
        gsap.to(cardEl, {
            rotateY: 0,
            rotateX: 0,
            scale: 1,
            duration: 0.4,
            ease: 'power2.out',
            overwrite: 'auto'
        });
    };

    if (loading || !gameData) {
        return (
            <div className="page" style={{ textAlign: 'center', padding: '4rem 0' }}>
                <RefreshCw className="spin" size={32} style={{ color: 'var(--accent)', margin: '0 auto' }} />
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>Loading cabinet...</div>
            </div>
        );
    }

    const rank = Gamification.getRank(gameData.rankPoints);
    const nextRank = Gamification.getNextRank(gameData.rankPoints);
    const progress = Gamification.getProgressToNextRank(gameData.rankPoints);
    const unlockedBadges = gameData.badges || [];

    const completedChallenges = challenges.filter(c => 
        (c.targets || []).includes(me.id) && 
        (c.status[me.id] === 'completed' || c.status[me.id] === 'approved')
    );

    const xpRemaining = nextRank ? (nextRank.min - gameData.rankPoints) : 0;

    const badgeDefinitions = Object.keys(Gamification.BADGES).map(key => ({
        name: key,
        ...Gamification.BADGES[key],
        isUnlocked: unlockedBadges.includes(key)
    }));

    const domainTrophies = [
        { key: 'fitness', title: 'The Titan', domain: 'Fitness', icon: '🏋️', color: '#ff1744' },
        { key: 'gaming', title: 'The Apex', domain: 'Gaming', icon: '🎮', color: '#00e5ff' },
        { key: 'food', title: 'The Chef', domain: 'Food', icon: '🍳', color: '#ffd600' },
        { key: 'creative', title: 'The Maestro', domain: 'Creative', icon: '🎨', color: '#ce93d8' },
        { key: 'entertainment', title: 'The Star', domain: 'Entertainment', icon: '🎭', color: '#ffb700' },
        { key: 'honor', title: 'The Knight', domain: 'Honor', icon: '🛡️', color: '#cfd8dc' },
        { key: 'social', title: 'The Diplomat', domain: 'Social', icon: '🗣️', color: '#90caf9' },
        { key: 'education', title: 'The Scholar', domain: 'Education', icon: '📚', color: '#a1887f' }
    ];

    const physicalTrophiesTrackA = [
        { key: 'bronze_play', title: 'Bronze Play Button', desc: 'Bronze Global Play Button', reqDares: 550, reqWins: 10, icon: '🏆', color: '#cd7f32' },
        { key: 'silver_play', title: 'Silver Play Button', desc: 'Silver Global Play Button', reqDares: 1100, reqWins: 20, icon: '🏆', color: '#c0c0c0' },
        { key: 'gold_play', title: 'Gold Play Button', desc: 'Gold Global Play Button', reqDares: 2200, reqWins: 40, icon: '🏆', color: '#ffd700' },
        { key: 'diamond_play', title: 'Diamond Play Button', desc: 'Diamond Global Play Button', reqDares: 4400, reqWins: 80, icon: '💎', color: '#b9f2ff' }
    ];

    const physicalTrophiesTrackB = [
        { key: 'fitness_trophy', title: 'The Titan', domain: 'Fitness', category: 'fitness', reqDares: 250, reqWins: 5, icon: '🏋️', color: '#ff1744', desc: 'Industrial Steel aesthetic' },
        { key: 'gaming_trophy', title: 'The Apex', domain: 'Gaming', category: 'gaming', reqDares: 250, reqWins: 5, icon: '🎮', color: '#00e5ff', desc: 'Cyber-Neon Acrylic' },
        { key: 'food_trophy', title: 'The Chef', domain: 'Food', category: 'food', reqDares: 250, reqWins: 5, icon: '🍳', color: '#ffd600', desc: 'Marble & Copper' },
        { key: 'creative_trophy', title: 'The Maestro', domain: 'Creative', category: 'creative', reqDares: 250, reqWins: 5, icon: '🎨', color: '#ce93d8', desc: 'Art-Glass' },
        { key: 'entertainment_trophy', title: 'The Star', domain: 'Entertainment', category: 'entertainment', reqDares: 250, reqWins: 5, icon: '🎭', color: '#ffb700', desc: 'Chrome & Gold' },
        { key: 'honor_trophy', title: 'The Knight', domain: 'Honor', category: 'honor', reqDares: 250, reqWins: 5, icon: '🛡️', color: '#cfd8dc', desc: 'Matte Silver Shield' },
        { key: 'social_trophy', title: 'The Diplomat', domain: 'Social', category: 'social', reqDares: 250, reqWins: 5, icon: '🗣️', color: '#90caf9', desc: 'Crystal Geometrics' },
        { key: 'education_trophy', title: 'The Scholar', domain: 'Education', category: 'education', reqDares: 250, reqWins: 5, icon: '📚', color: '#a1887f', desc: 'Brass & Wood' }
    ];

    return (
        <div className="page" id="page-profile" ref={containerRef}>
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>My <span>Profile</span></div>
                <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={handleLogoutClick}
                    style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600 }}
                >
                    <LogOut size={14} /> Log Out
                </button>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="profile-header-card">
                    <div className="profile-avatar-wrap" onClick={handleAvatarClick}>
                        <Avatar user={me} size="lg" />
                        <div className="profile-avatar-overlay">
                            <Camera size={18} />
                        </div>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleAvatarChange}
                            disabled={uploadingAvatar}
                        />
                    </div>
                    
                    <div className="profile-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div className="profile-name">{me.name}</div>
                            {gameData.isVIP && (
                                <span title="VIP Gold Badge" style={{ color: 'var(--gold)', display: 'inline-flex', alignItems: 'center' }}>
                                    <Crown size={18} fill="var(--gold)" />
                                </span>
                            )}
                        </div>
                        <div className="profile-sub">
                            @{me.username} · Joined {new Date(me.joinDate || Date.now()).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                        </div>
                        <div className="profile-badges" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span className={`rank-badge ${rank.css}`}>
                                <Award size={12} /> {rank.name}
                            </span>
                            {gameData?.strikesCount > 0 && (
                                <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(255, 51, 51, 0.1)', color: 'var(--red)', border: '1px solid rgba(255, 51, 51, 0.2)', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                                    ⚠️ {gameData.strikesCount} {gameData.strikesCount === 1 ? 'Strike' : 'Strikes'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                        <div className="streak-box">
                            <div className="streak-val" style={{ color: 'var(--accent)' }}>
                                {gameData.currentStreak || 0}
                                <Flame size={20} fill="var(--accent)" style={{ marginLeft: '0.2rem' }} />
                            </div>
                            <div className="streak-label">STREAK DAYS</div>
                        </div>
                        <div className="streak-box">
                            <div className="streak-val" style={{ color: 'var(--neon)' }}>
                                {gameData.longestStreak || 0}
                                <Zap size={18} fill="var(--neon)" style={{ marginLeft: '0.2rem' }} />
                            </div>
                            <div className="streak-label">MAX STREAK</div>
                        </div>
                    </div>
                </div>

                <div className="divider" />

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700 }}>Rank Progression</span>
                        <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                            {gameData.rankPoints} XP {nextRank ? `/ ${nextRank.min} XP` : '(Max Rank)'}
                        </span>
                    </div>
                    
                    <div className="progress-bar" style={{ height: '8px' }}>
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    
                    {nextRank && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.4rem', textAlign: 'right' }}>
                            {xpRemaining} XP remaining to unlock <strong>{nextRank.name}</strong>
                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        💰 Wallet & Monetization
                    </span>
                    {gameData.isVIP && (
                        <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.25rem 0.5rem' }}>
                            <Crown size={12} fill="var(--gold)" /> VIP Status Active
                        </span>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
                    <div style={{ background: 'rgba(0, 240, 255, 0.03)', border: '1px solid rgba(0, 240, 255, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Available Balance</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--neon)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                            ₹{(gameData.balance || 0).toFixed(2)}
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255, 183, 0, 0.03)', border: '1px solid rgba(255, 183, 0, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Pending Escrow (24h)</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                            ₹{(gameData.pendingBalance || 0).toFixed(2)}
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255, 0, 85, 0.03)', border: '1px solid rgba(255, 0, 85, 0.1)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>Career Earnings</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                            ₹{(gameData.totalEarnings || 0).toFixed(2)}
                        </div>
                    </div>
                </div>

                <div className="divider" />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                                <Crown size={14} fill="var(--gold)" /> VIP Membership
                            </div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: '1.3' }}>
                                Unlock gold checkmark badge and Spy Power to view lifetime earnings of competitors on the Leaderboard.
                            </p>
                        </div>
                        <div style={{ marginTop: '0.75rem' }}>
                            {gameData.isVIP ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    ✓ Active Sub (₹5/mo)
                                </span>
                            ) : (
                                <button 
                                    className="btn btn-primary btn-xs" 
                                    style={{ width: '100%', background: 'linear-gradient(45deg, var(--gold), #ffb700)', border: 'none', color: '#000', fontWeight: 700, padding: '0.35rem 0.5rem' }}
                                    onClick={handleBuyVIP}
                                >
                                    Unlock VIP @ ₹5
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--neon)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                                🔓 Creator License
                            </div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: '1.3' }}>
                                Bypass the 25 public dare completion requirement. Host Cash Prize Pool challenges instantly.
                            </p>
                        </div>
                        <div style={{ marginTop: '0.75rem' }}>
                            {gameData.hasCreatorLicense || gameData.totalCompleted >= 25 ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                    ✓ Active License
                                </span>
                            ) : (
                                <button 
                                    className="btn btn-primary btn-xs" 
                                    style={{ width: '100%', borderColor: 'var(--border)', padding: '0.35rem 0.5rem' }}
                                    onClick={handleBuyLicense}
                                >
                                    Get License @ ₹10
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="divider" />

                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
                        💸 Withdraw Earnings
                    </div>
                    <form onSubmit={handleWithdrawSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: '0.25rem' }}>
                            <label style={{ fontSize: '0.68rem', textTransform: 'none', color: 'var(--muted)' }}>Withdrawal Method</label>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                <button 
                                    type="button" 
                                    className={`btn btn-xs ${withdrawMethod === 'upi' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setWithdrawMethod('upi')}
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', height: 'auto', margin: 0 }}
                                >
                                    UPI (VPA)
                                </button>
                                <button 
                                    type="button" 
                                    className={`btn btn-xs ${withdrawMethod === 'bank' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setWithdrawMethod('bank')}
                                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', height: 'auto', margin: 0 }}
                                >
                                    Bank Transfer
                                </button>
                            </div>
                        </div>

                        {withdrawMethod === 'upi' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '180px' }}>
                                    <label style={{ fontSize: '0.68rem', textTransform: 'none', color: 'var(--muted)', marginBottom: '0.25rem' }}>UPI ID or VPA</label>
                                    <input 
                                        type="text" 
                                        placeholder="name@okaxis" 
                                        value={withdrawUpi}
                                        onChange={(e) => setWithdrawUpi(e.target.value)}
                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                        required={withdrawMethod === 'upi'}
                                    />
                                </div>
                                <div style={{ width: '120px' }}>
                                    <label style={{ fontSize: '0.68rem', textTransform: 'none', color: 'var(--muted)', marginBottom: '0.25rem' }}>Amount (₹)</label>
                                    <input 
                                        type="number" 
                                        placeholder="Min 100" 
                                        min="100"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label style={{ fontSize: '0.68rem', textTransform: 'none', color: 'var(--muted)', marginBottom: '0.25rem' }}>Account Number</label>
                                        <input 
                                            type="text" 
                                            placeholder="123456789012" 
                                            value={bankAccount}
                                            onChange={(e) => setBankAccount(e.target.value)}
                                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                            required={withdrawMethod === 'bank'}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '120px' }}>
                                        <label style={{ fontSize: '0.68rem', textTransform: 'none', color: 'var(--muted)', marginBottom: '0.25rem' }}>IFSC Code</label>
                                        <input 
                                            type="text" 
                                            placeholder="HDFC0001234" 
                                            value={bankIfsc}
                                            onChange={(e) => setBankIfsc(e.target.value)}
                                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                            required={withdrawMethod === 'bank'}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label style={{ fontSize: '0.68rem', textTransform: 'none', color: 'var(--muted)', marginBottom: '0.25rem' }}>Holder Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="John Doe" 
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                            required={withdrawMethod === 'bank'}
                                        />
                                    </div>
                                    <div style={{ width: '120px' }}>
                                        <label style={{ fontSize: '0.68rem', textTransform: 'none', color: 'var(--muted)', marginBottom: '0.25rem' }}>Amount (₹)</label>
                                        <input 
                                            type="number" 
                                            placeholder="Min 100" 
                                            min="100"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Fee: A flat ₹10.00 bank fee will be deducted</span>
                            {withdrawAmount >= 100 && (
                                <span style={{ color: 'var(--green)' }}>Est. Payout: ₹{(withdrawAmount - 10).toFixed(2)}</span>
                            )}
                        </div>
                        <button 
                            type="submit" 
                            className="btn btn-primary btn-sm" 
                            style={{ alignSelf: 'flex-start', margin: 0, padding: '0.4rem 1rem' }}
                        >
                            Submit Payout Request
                        </button>
                    </form>
                </div>

                {((gameData.withdrawals && gameData.withdrawals.length > 0) || (gameData.earningsHistory && gameData.earningsHistory.length > 0)) && (
                    <div style={{ marginTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '0.5rem' }}>
                            Transaction History
                        </div>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            {[
                                ...(gameData.withdrawals || []).map(w => ({ ...w, txType: 'withdrawal' })),
                                ...(gameData.earningsHistory || []).map(e => ({ ...e, txType: 'earning' }))
                            ].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((tx, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', padding: '0.3rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <div>
                                        <span style={{ fontWeight: 600, color: tx.txType === 'withdrawal' ? 'var(--accent)' : 'var(--neon)' }}>
                                            {tx.txType === 'withdrawal' ? 'Withdrawal Request' : tx.type === 'prize_share' ? 'Prize Split Win' : 'Creator Participation Reward'}
                                        </span>
                                        <span style={{ color: 'var(--muted)', marginLeft: '0.3rem' }}>
                                            {tx.txType === 'withdrawal' ? `(VPA: ${tx.upi})` : `(${tx.challengeName})`}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontWeight: 700, color: tx.txType === 'withdrawal' ? 'var(--red)' : 'var(--green)' }}>
                                            {tx.txType === 'withdrawal' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                                        </span>
                                        <span 
                                            style={{ 
                                                fontSize: '0.6rem', 
                                                padding: '0.1rem 0.35rem', 
                                                borderRadius: '4px',
                                                textTransform: 'capitalize',
                                                background: tx.status === 'approved' || tx.status === 'available' ? 'rgba(0,255,0,0.08)' : tx.status === 'pending' ? 'rgba(255,183,0,0.08)' : 'rgba(255,0,0,0.08)',
                                                color: tx.status === 'approved' || tx.status === 'available' ? 'var(--green)' : tx.status === 'pending' ? 'var(--gold)' : 'var(--red)'
                                            }}
                                        >
                                            {tx.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-section-title">
                    <Award size={18} style={{ color: 'var(--accent)' }} /> Achievement Badges
                </div>
                
                <div className="badges-grid">
                    {badgeDefinitions.map((b, idx) => (
                        <div 
                            key={idx} 
                            className={`badge-card ${!b.isUnlocked ? 'locked' : 'unlocked'}`}
                            title={b.desc}
                        >
                            <div className="badge-icon">
                                {b.name === 'First Blood' ? <Zap size={22} style={{ color: b.isUnlocked ? 'var(--neon)' : 'var(--muted)' }} /> : 
                                 b.name === 'On Fire' ? <Flame size={22} style={{ color: b.isUnlocked ? 'var(--accent)' : 'var(--muted)' }} /> :
                                 b.name === 'Unstoppable' ? <Trophy size={22} style={{ color: b.isUnlocked ? 'var(--gold)' : 'var(--muted)' }} /> :
                                 b.name === 'Socialite' ? <Users size={22} style={{ color: b.isUnlocked ? 'var(--purple)' : 'var(--muted)' }} /> :
                                 b.name === 'Creator' ? <Plus size={22} style={{ color: b.isUnlocked ? 'var(--neon)' : 'var(--muted)' }} /> :
                                 b.name === 'Verifier' ? <CheckCircle size={22} style={{ color: b.isUnlocked ? 'var(--green)' : 'var(--muted)' }} /> :
                                 b.name === 'DomainMaster' ? <Star size={22} style={{ color: b.isUnlocked ? 'var(--gold)' : 'var(--muted)' }} /> : 
                                 <Megaphone size={22} style={{ color: b.isUnlocked ? 'var(--accent2)' : 'var(--muted)' }} />}
                            </div>
                            <div className="badge-label" style={{ fontWeight: b.isUnlocked ? 700 : 500, color: b.isUnlocked ? 'var(--text)' : 'var(--muted)' }}>
                                {b.name}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-section-title">
                    <Star size={18} style={{ color: 'var(--gold)' }} /> Domain Mastery Cabinet
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '-0.4rem', marginBottom: '1rem' }}>
                    Requires 10 verified completions in a category. Unlocks specialized title badge.
                </div>

                <div className="trophy-grid">
                    {domainTrophies.map((t, idx) => {
                        const count = gameData.completedByCategory?.[t.key] || 0;
                        const isUnlocked = count >= 10;
                        let cardEl = null;

                        return (
                            <div 
                                key={idx} 
                                ref={el => cardEl = el}
                                className="trophy-card"
                                onMouseMove={(e) => handleMouseMove(e, cardEl)}
                                onMouseLeave={() => handleMouseLeave(cardEl)}
                                style={{ 
                                    opacity: isUnlocked ? 1 : 0.45,
                                    border: isUnlocked ? `1px solid ${t.color}` : '1px solid var(--border)',
                                    boxShadow: isUnlocked ? `0 0 15px ${t.color}20` : 'none'
                                }}
                            >
                                <div 
                                    className="trophy-icon-wrap"
                                    style={{ 
                                        background: isUnlocked ? `${t.color}15` : 'rgba(255,255,255,0.02)',
                                        border: isUnlocked ? `1px solid ${t.color}30` : '1px solid transparent'
                                    }}
                                >
                                    {isUnlocked ? (
                                        <Trophy size={26} style={{ color: t.color }} />
                                    ) : (
                                        <Lock size={18} style={{ color: 'var(--muted)' }} />
                                    )}
                                </div>
                                <div className="trophy-label">{t.title}</div>
                                <div className="trophy-domain">{t.domain}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
                                    {count} / 10 completed
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        🏆 Physical Trophy Claims (Free Shipping)
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--accent)', cursor: 'pointer', margin: 0 }}>
                        <input 
                            type="checkbox" 
                            checked={bypassRequirements} 
                            onChange={(e) => setBypassRequirements(e.target.checked)}
                            style={{ width: 'auto', accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                        <span>Bypass Requirements</span>
                    </label>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '-0.3rem', marginBottom: '1.25rem' }}>
                    Earn high-end physical awards mailed straight to your doorstep at no charge! Complete required hard public dares and wins to qualify.
                </p>

                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        ⭐ Track A: Platform Dominance Series
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                        {physicalTrophiesTrackA.map((t) => {
                            const currentDares = gameData.hardCompleted || 0;
                            const currentWins = gameData.wins || 0;
                            const claimed = (gameData.claimedTrophies || []).includes(t.key);
                            const eligible = bypassRequirements || (currentDares >= t.reqDares && currentWins >= t.reqWins);

                            return (
                                <div key={t.key} style={{ background: 'rgba(255,255,255,0.01)', border: claimed ? `1px solid var(--green)` : eligible ? `1px solid ${t.color}` : '1px solid var(--border)', padding: '0.85rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.3s' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>{t.title}</span>
                                            <span style={{ fontSize: '1.25rem' }}>{t.icon}</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                                            Requires {t.reqDares} Hard Dares & {t.reqWins} Wins.
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--muted)' }}>
                                                <span>Hard Dares: {currentDares} / {t.reqDares}</span>
                                                <span>Wins: {currentWins} / {t.reqWins}</span>
                                            </div>
                                            <div className="progress-bar" style={{ height: '4px' }}>
                                                <div 
                                                    className="progress-fill" 
                                                    style={{ 
                                                        width: `${Math.min(100, ((currentDares + currentWins) / (t.reqDares + t.reqWins)) * 100)}%`,
                                                        background: t.color
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '0.75rem' }}>
                                        {claimed ? (
                                            <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                ✓ Claimed & Shipped
                                            </span>
                                        ) : eligible ? (
                                            <button 
                                                className="btn btn-success btn-xs" 
                                                style={{ width: '100%', padding: '0.3rem', fontSize: '0.7rem', boxShadow: `0 0 10px ${t.color}30`, animation: 'pulse 2s infinite' }}
                                                onClick={() => handleClaimClick(t)}
                                            >
                                                Claim Trophy Free!
                                            </button>
                                        ) : (
                                            <span style={{ color: 'var(--muted)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                🔒 Locked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--neon)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        ⭐ Track B: Category Specialist Trophies
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                        {physicalTrophiesTrackB.map((t) => {
                            const currentDares = gameData.hardCompletedByCategory?.[t.category] || 0;
                            const currentWins = gameData.winsByCategory?.[t.category] || 0;
                            const claimed = (gameData.claimedTrophies || []).includes(t.key);
                            const eligible = bypassRequirements || (currentDares >= t.reqDares && currentWins >= t.reqWins);

                            return (
                                <div key={t.key} style={{ background: 'rgba(255,255,255,0.01)', border: claimed ? `1px solid var(--green)` : eligible ? `1px solid ${t.color}` : '1px solid var(--border)', padding: '0.85rem', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'all 0.3s' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>{t.title}</span>
                                                <span style={{ display: 'block', fontSize: '0.62rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.domain} Specialist</span>
                                            </div>
                                            <span style={{ fontSize: '1.25rem' }}>{t.icon}</span>
                                        </div>
                                        <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                                            "{t.desc}"
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.4rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--muted)' }}>
                                                <span>Dares: {currentDares} / {t.reqDares}</span>
                                                <span>Wins: {currentWins} / {t.reqWins}</span>
                                            </div>
                                            <div className="progress-bar" style={{ height: '4px' }}>
                                                <div 
                                                    className="progress-fill" 
                                                    style={{ 
                                                        width: `${Math.min(100, ((currentDares + currentWins) / (t.reqDares + t.reqWins)) * 100)}%`,
                                                        background: t.color
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '0.75rem' }}>
                                        {claimed ? (
                                            <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                ✓ Claimed & Shipped
                                            </span>
                                        ) : eligible ? (
                                            <button 
                                                className="btn btn-success btn-xs" 
                                                style={{ width: '100%', padding: '0.3rem', fontSize: '0.7rem', boxShadow: `0 0 10px ${t.color}30`, animation: 'pulse 2s infinite' }}
                                                onClick={() => handleClaimClick(t)}
                                            >
                                                Claim Trophy Free!
                                            </button>
                                        ) : (
                                            <span style={{ color: 'var(--muted)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                🔒 Locked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-section-title">
                    <Layers size={18} style={{ color: 'var(--neon)' }} /> Conquered Dare Portfolio
                </div>

                {completedChallenges.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        No completed dares logged in your portfolio.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                        {completedChallenges.map(c => (
                            <div 
                                key={c.id} 
                                className="portfolio-card"
                                style={{ background: 'var(--bg-solid)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'capitalize', marginTop: '0.15rem' }}>
                                        {c.category} · {c.difficulty}
                                    </div>
                                </div>
                                <span className="badge badge-green" style={{ padding: '0.15rem 0.5rem', fontSize: '0.65rem' }}>
                                    Conquered
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {claimModalOpen && activeTrophyClaim && (
                <div className="modal-overlay" style={{ zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal" style={{ maxWidth: '420px', width: '100%', padding: '2rem', background: 'rgba(12, 12, 22, 0.98)', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                            <span style={{ fontSize: '2.5rem' }}>🏆</span>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--gold)', marginTop: '0.5rem' }}>
                                Claim Real Physical Trophy
                            </h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                                Unlocked: <strong>{activeTrophyClaim.title}</strong>
                            </p>
                        </div>
                        
                        <form onSubmit={handleClaimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.7rem' }}>Recipient Full Name</label>
                                <input 
                                    type="text" 
                                    value={claimName} 
                                    onChange={e => setClaimName(e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.7rem' }}>Full Shipping Address</label>
                                <textarea 
                                    placeholder="Street, Apartment, City, State, ZIP code"
                                    value={claimAddress} 
                                    onChange={e => setClaimAddress(e.target.value)} 
                                    required 
                                    style={{ minHeight: '60px', padding: '0.5rem', fontSize: '0.8rem' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.7rem' }}>Phone Number (for Courier)</label>
                                <input 
                                    type="text" 
                                    value={claimPhone} 
                                    onChange={e => setClaimPhone(e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.7rem' }}>Name Custom Engraving Label</label>
                                <input 
                                    type="text" 
                                    value={claimEngraving} 
                                    onChange={e => setClaimEngraving(e.target.value)} 
                                    placeholder="Name printed on metal tag"
                                    required 
                                />
                            </div>
                            
                            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                💡 Free delivery worldwide. Estimated shipping time is 7-14 business days.
                            </div>
                            
                            <div className="modal-footer" style={{ marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setClaimModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(45deg, var(--gold), #ffb700)', border: 'none', color: '#000', fontWeight: 700 }}>
                                    Submit Shipping Claim
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
