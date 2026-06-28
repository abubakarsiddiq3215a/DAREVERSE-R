import React, { useState, useEffect } from 'react';
import { db } from './services/firebase';
import { Auth } from './services/auth';
import { DB } from './services/db';
import Navbar from './components/Navbar';
import { ToastProvider, useToast } from './components/Toast';

// Pages
import Login from './pages/Login';
import Feed from './pages/Feed';
import Challenges from './pages/Challenges';
import Friends from './pages/Friends';
import ProofsInbox from './pages/ProofsInbox';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';

// Modals
import CreateChallenge from './components/CreateChallenge';
import SubmitProof from './components/SubmitProof';
import ViewProof from './components/ViewProof';
import HelpModal from './components/HelpModal';
import NotificationsPanel from './components/NotificationsPanel';
import PaymentModal from './components/PaymentModal';

import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import gsap from 'gsap';

export const MainApp = () => {
    const toastHook = useToast();
    const showMsg = toastHook ? toastHook.showToast : console.log;

    const [user, setUser] = useState(null);
    const [me, setMe] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentPage, setCurrentPage] = useState('feed');
    const [adminViewOpen, setAdminViewOpen] = useState(false);
    const [myGameData, setMyGameData] = useState(null);

    // Live Collection states
    const [challenges, setChallenges] = useState([]);
    const [proofs, setProofs] = useState([]);
    const [users, setUsers] = useState([]);
    const [friendsIds, setFriendsIds] = useState([]);
    const [requests, setRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // Modal state toggles
    const [createChallengeOpen, setCreateChallengeOpen] = useState(false);
    const [submitProofOpen, setSubmitProofOpen] = useState(false);
    const [viewProofOpen, setViewProofOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    // Payment Gateway simulator state
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentArgs, setPaymentArgs] = useState({ amount: 0, title: '', onSuccess: () => {} });

    const triggerPayment = (amount, title, onSuccessCallback) => {
        setPaymentArgs({
            amount,
            title,
            onSuccess: onSuccessCallback
        });
        setPaymentOpen(true);
    };

    // Active items for detail views
    const [activeChallenge, setActiveChallenge] = useState(null);
    const [activeProof, setActiveProof] = useState(null);
    const [activeProofUser, setActiveProofUser] = useState(null);
    const [proofModalMode, setProofModalMode] = useState('view'); // 'view' | 'verify' | 'vote'

    // Auth state observer
    useEffect(() => {
        const unsubscribe = Auth.initAuthListener(async (firebaseUser, profile) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                setMe(profile || Auth.me());
                
                // Check if user is admin
                const adminCheck = await DB.isCurrentUserAdmin(firebaseUser.uid) || firebaseUser.email === 'admin@dareverse.com' || profile?.username === 'admin';
                setIsAdmin(adminCheck);
            } else {
                setUser(null);
                setMe(null);
                setIsAdmin(false);
                setCurrentPage('feed');
                setAdminViewOpen(false);
            }
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    // Live DB Listeners (Only active when logged in)
    useEffect(() => {
        if (!user) return;

        // 1. Users real-time syncing
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            const list = snap.docs.map(doc => doc.data());
            setUsers(list);
            
            // Sync current user's profile updates
            const myProfile = list.find(u => u.id === user.uid);
            if (myProfile) setMe(myProfile);
        });

        // 2. Friends list syncing
        const unsubFriends = onSnapshot(doc(db, 'social', user.uid), (snap) => {
            if (snap.exists()) {
                setFriendsIds(snap.data().friends || []);
            } else {
                setFriendsIds([]);
            }
        });

        // 3. Friend requests syncing
        const unsubRequests = onSnapshot(collection(db, 'social', user.uid, 'requests'), (snap) => {
            const list = snap.docs.map(doc => doc.data());
            setRequests(list);
        });

        // 4. Challenges real-time syncing
        const unsubChallenges = onSnapshot(collection(db, 'challenges'), (snap) => {
            const list = snap.docs.map(doc => doc.data());
            setChallenges(list);
        });

        // 5. Proofs real-time syncing
        const unsubProofs = onSnapshot(collection(db, 'proofs'), (snap) => {
            const list = snap.docs.map(doc => doc.data());
            setProofs(list);
        });

        // 6. Notifications real-time syncing
        const qNotifs = query(collection(db, 'notification'), where('to', '==', user.uid));
        const unsubNotifications = onSnapshot(qNotifs, (snap) => {
            const list = snap.docs.map(doc => doc.data());
            
            // Sort in memory by timestamp descending
            list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setNotifications(list);

            // Display browser alert toasts on new incoming notifications
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const n = change.doc.data();
                    const age = Date.now() - new Date(n.timestamp).getTime();
                    if (age < 4000) {
                        // Toast Alert
                        const msgMap = {
                            friend_request: `${n.fromName} sent you a friend request!`,
                            friend_accepted: `${n.fromName} accepted your friend request!`,
                            challenge_sent: `${n.fromName} challenged you to a dare!`,
                            challenge_completed: `${n.fromName} completed your challenge!`,
                            challenge_accepted: `${n.fromName} accepted your challenge!`,
                            proof_approved: `Your proof was approved!`,
                            proof_rejected: `Your proof was rejected.`
                        };
                        const alertText = msgMap[n.type] || n.message || 'New Alert!';
                        const toastType = n.type.includes('reject') ? 'error' : n.type.includes('approved') ? 'success' : 'info';
                        showMsg(alertText, toastType);
                    }
                }
            });
        });

        // 7. Live gamification sync for current user safety/balance status
        const unsubMyGamification = onSnapshot(doc(db, 'gamification', user.uid), (snap) => {
            if (snap.exists()) {
                setMyGameData(snap.data());
            } else {
                setMyGameData(null);
            }
        });

        return () => {
            unsubUsers();
            unsubFriends();
            unsubRequests();
            unsubChallenges();
            unsubProofs();
            unsubNotifications();
            unsubMyGamification();
        };
    }, [user]);

    // GSAP page transitions on route changes
    useEffect(() => {
        if (user && !adminViewOpen) {
            const activePageEl = document.querySelector('.page');
            if (activePageEl) {
                gsap.killTweensOf(activePageEl);
                gsap.fromTo(activePageEl, 
                    { opacity: 0, y: 15, scale: 0.99 },
                    { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out' }
                );
            }
        }
    }, [currentPage, adminViewOpen, user]);

    // Handle refresh trigger callback
    const handleRefresh = async () => {
        // Data triggers are real-time, but we force sync current profile just in case
        if (user) {
            await DB.syncMyProfile(user.uid);
        }
    };

    // Calculate unread badge count
    const unreadCount = notifications.filter(n => !n.read).length;

    // Count pending proofs awaiting review for current creator
    const pendingProofsCount = proofs.filter(p => {
        const chal = challenges.find(c => c.id === p.chalId);
        return chal && chal.creator === user?.uid && p.approved === null && p.fromId !== user?.uid;
    }).length;

    // Notification Handlers
    const handleMarkRead = async (id) => {
        try {
            await DB.updateNotification(id, { read: true });
        } catch (e) {
            console.error('Failed to mark notification as read:', e);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const unreads = notifications.filter(n => !n.read);
            for (const n of unreads) {
                await DB.updateNotification(n.id, { read: true });
            }
            showMsg('All alerts marked read', 'success');
        } catch (e) {
            console.error(e);
        }
    };

    const handleClearAllNotifs = async () => {
        try {
            for (const n of notifications) {
                await DB.deleteNotification(n.id);
            }
            showMsg('Notifications cleared', 'info');
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemoveNotif = async (id) => {
        try {
            await DB.deleteNotification(id);
            showMsg('Notification removed');
        } catch (e) {
            console.error(e);
        }
    };

    // Card Actions Dispatchers
    const openCreateChallengeModal = (tagUser = null) => {
        setCreateChallengeOpen(true);
        // Pre-tag logic inside modal is handled via ref or we can let taggedUsers populate
    };

    const openSubmitProofModal = (challengeItem) => {
        setActiveChallenge(challengeItem);
        setSubmitProofOpen(true);
    };

    const openViewMyProofModal = (challengeItem) => {
        const proofItem = proofs.find(p => p.chalId === challengeItem.id && p.fromId === user.uid);
        if (proofItem) {
            setActiveChallenge(challengeItem);
            setActiveProof(proofItem);
            setActiveProofUser(me);
            setProofModalMode('view');
            setViewProofOpen(true);
        }
    };

    const openVerifyProofModal = (proofItem, challengeItem) => {
        const submitter = users.find(u => u.id === proofItem.fromId);
        setActiveChallenge(challengeItem);
        setActiveProof(proofItem);
        setActiveProofUser(submitter);
        setProofModalMode('verify');
        setViewProofOpen(true);
    };

    const openVoteProofModal = (proofItem, challengeItem) => {
        const submitter = users.find(u => u.id === proofItem.fromId);
        setActiveChallenge(challengeItem);
        setActiveProof(proofItem);
        setActiveProofUser(submitter);
        setProofModalMode('vote');
        setViewProofOpen(true);
    };

    // Render logic routing
    const renderActivePage = () => {
        switch (currentPage) {
            case 'feed':
                return (
                    <Feed 
                        me={me} 
                        users={users}
                        friends={friendsIds}
                        challenges={challenges}
                        proofs={proofs}
                        onOpenCreateChallenge={() => openCreateChallengeModal()}
                        onOpenSubmitProof={openSubmitProofModal}
                        onOpenViewProof={openViewMyProofModal}
                        onOpenVerifyProof={openVerifyProofModal}
                        onOpenVoteProof={openVoteProofModal}
                        onRefreshData={handleRefresh}
                    />
                );
            case 'challenges':
                return (
                    <Challenges 
                        me={me} 
                        users={users}
                        challenges={challenges}
                        proofs={proofs}
                        onOpenCreateChallenge={() => openCreateChallengeModal()}
                        onOpenSubmitProof={openSubmitProofModal}
                        onOpenViewProof={openViewMyProofModal}
                        onOpenVerifyProof={openVerifyProofModal}
                        onRefreshData={handleRefresh}
                    />
                );
            case 'friends':
                return (
                    <Friends 
                        me={me} 
                        users={users}
                        friendsIds={friendsIds}
                        requests={requests}
                        onOpenCreateChallenge={(friend) => {
                            openCreateChallengeModal();
                        }}
                        onRefreshData={handleRefresh}
                    />
                );
            case 'proofs':
                return (
                    <ProofsInbox 
                        me={me} 
                        challenges={challenges}
                        users={users}
                        proofs={proofs}
                        onOpenVerifyProof={openVerifyProofModal}
                        onOpenVoteProof={openVoteProofModal}
                        onRefreshData={handleRefresh}
                    />
                );
            case 'leaderboard':
                return (
                    <Leaderboard 
                        me={me} 
                        users={users}
                        friendsIds={friendsIds}
                        onRefreshData={handleRefresh}
                    />
                );
            case 'profile':
                return (
                    <Profile 
                        me={me} 
                        challenges={challenges}
                        onRefreshData={handleRefresh}
                        onTriggerPayment={triggerPayment}
                    />
                );
            default:
                return <Feed me={me} />;
        }
    };

    // If not authenticated, show Login screen
    if (!user) {
        return <Login onLoginSuccess={handleRefresh} />;
    }

    const isTerminated = myGameData?.isTerminated || false;
    const banUntil = myGameData?.banUntil ? new Date(myGameData.banUntil) : null;
    const isBanned = banUntil && banUntil > new Date();

    // Lockout Overlay for Safety Banned / Terminated Accounts
    if (user && (isTerminated || isBanned)) {
        return (
            <div className="lockout-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'radial-gradient(circle at center, #110307 0%, #050102 100%)', color: '#fff', padding: '2rem', textAlign: 'center' }}>
                <div style={{ padding: '2.5rem', background: 'rgba(255, 255, 255, 0.02)', border: '2px solid var(--accent)', borderRadius: '24px', maxWidth: '480px', boxShadow: '0 0 40px rgba(255, 0, 85, 0.25)', backdropFilter: 'blur(20px)' }}>
                    <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 15px var(--accent))' }}>
                        {isTerminated ? '❌' : '⚠️'}
                    </span>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', letterSpacing: '1px', marginBottom: '1rem', color: 'var(--accent)' }}>
                        {isTerminated ? 'ACCOUNT TERMINATED' : 'ACCESS SUSPENDED'}
                    </h1>
                    <p style={{ fontSize: '0.95rem', color: '#ccc', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                        {isTerminated 
                            ? 'This account has been permanently terminated for violating DareVerse Community Guidelines. Access to all features is restricted.' 
                            : `Your account has been temporarily suspended for a safety guideline strike (e.g. submitting fake/invalid proofs).`
                        }
                    </p>
                    {isBanned && (
                        <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '2rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>SUSPENSION LIFTS ON</span>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gold)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                                {banUntil.toLocaleString('en-GB')}
                            </div>
                        </div>
                    )}
                    <button 
                        className="btn btn-primary" 
                        onClick={() => Auth.logout()}
                        style={{ background: 'var(--accent)', boxShadow: '0 0 15px var(--accent)', width: '100%', padding: '0.85rem' }}
                    >
                        Sign Out of Account
                    </button>
                </div>
            </div>
        );
    }

    // If admin drawer active
    if (adminViewOpen) {
        return <AdminDashboard onClose={() => setAdminViewOpen(false)} />;
    }

    return (
        <div className="app-container">
            {/* Header Desktop / Footer Mobile navigation panel */}
            <Navbar 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage} 
                me={me} 
                unreadCount={unreadCount}
                pendingProofsCount={pendingProofsCount}
                pendingRequestsCount={requests.length}
                isAdmin={isAdmin}
                onToggleNotifications={() => setNotificationsOpen(prev => !prev)}
                onOpenHelp={() => setHelpOpen(true)}
                onOpenAdmin={() => setAdminViewOpen(true)}
            />

            {/* Notification drop panel */}
            <NotificationsPanel 
                isOpen={notificationsOpen} 
                onClose={() => setNotificationsOpen(false)}
                notifications={notifications}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
                onClearAll={handleClearAllNotifs}
                onRemove={handleRemoveNotif}
                setCurrentPage={setCurrentPage}
            />

            {/* Main content viewport */}
            <main>
                {renderActivePage()}
            </main>

            {/* Global floating modal panels */}
            <CreateChallenge 
                isOpen={createChallengeOpen} 
                onClose={() => setCreateChallengeOpen(false)}
                me={me}
                friendsList={users.filter(u => friendsIds.includes(u.id))}
                onChallengeCreated={handleRefresh}
                onTriggerPayment={triggerPayment}
            />

            <PaymentModal 
                isOpen={paymentOpen}
                onClose={() => setPaymentOpen(false)}
                amount={paymentArgs.amount}
                title={paymentArgs.title}
                onSuccess={paymentArgs.onSuccess}
                me={me}
            />

            <SubmitProof 
                isOpen={submitProofOpen}
                onClose={() => setSubmitProofOpen(false)}
                challenge={activeChallenge}
                me={me}
                onProofSubmitted={handleRefresh}
            />

            <ViewProof 
                isOpen={viewProofOpen}
                onClose={() => setViewProofOpen(false)}
                proof={activeProof}
                challenge={activeChallenge}
                fromUser={activeProofUser}
                me={me}
                mode={proofModalMode}
                onActionComplete={handleRefresh}
            />

            <HelpModal 
                isOpen={helpOpen}
                onClose={() => setHelpOpen(false)}
            />
        </div>
    );
};

export const App = () => {
    return (
        <ToastProvider>
            <MainApp />
        </ToastProvider>
    );
};

export default App;
