import { db } from './firebase';
import { 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    collection, 
    query, 
    orderBy, 
    where, 
    writeBatch 
} from 'firebase/firestore';

// Keys for local caching
const USERS_KEY = 'dv_users';
const MY_PROFILE_KEY = 'dv_my_profile';

// In-Memory Cache
let _usersCache = null;
let _usersCacheTime = 0;
let _friendsCache = {};
let _friendsCacheTime = {};
let _requestsCache = {};
let _requestsCacheTime = {};
let _challengesCache = null;
let _challengesCacheTime = 0;
let _proofsCache = null;
let _proofsCacheTime = 0;
let _allGameDataCache = null;
let _allGameDataCacheTime = 0;

export const DB = {
    // Basic LocalStorage Helpers
    get(key) {
        try { return JSON.parse(localStorage.getItem(key)); }
        catch { return null; }
    },
    set(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); }
        catch (e) { console.error("LocalStorage error:", e); }
    },
    remove(key) { localStorage.removeItem(key); },

    clearCache(type) {
        const now = Date.now();
        if (!type || type === 'all') {
            _usersCache = null;
            _usersCacheTime = 0;
            _friendsCache = {};
            _friendsCacheTime = {};
            _requestsCache = {};
            _requestsCacheTime = {};
            _challengesCache = null;
            _challengesCacheTime = 0;
            _proofsCache = null;
            _proofsCacheTime = 0;
            _allGameDataCache = null;
            _allGameDataCacheTime = 0;
        } else if (type === 'challenges') {
            _challengesCache = null;
            _challengesCacheTime = 0;
        } else if (type === 'proofs') {
            _proofsCache = null;
            _proofsCacheTime = 0;
        } else if (type === 'users') {
            _usersCache = null;
            _usersCacheTime = 0;
        } else if (type === 'friends') {
            _friendsCache = {};
            _friendsCacheTime = {};
        } else if (type === 'requests') {
            _requestsCache = {};
            _requestsCacheTime = {};
        } else if (type === 'gamification') {
            _allGameDataCache = null;
            _allGameDataCacheTime = 0;
        }
    },

    // --- FIRESTORE SYNC ---

    // Sync my profile
    async syncMyProfile(uid) {
        if (!uid) return null;
        const userDocRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            this.set(MY_PROFILE_KEY, data);
            return data;
        }
        return null;
    },

    async updateUserProfile(uid, fields) {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, fields);
        this.clearCache('users');
    },

    // Get all users (cached or fresh)
    async getUsers(force = false) {
        const now = Date.now();
        if (_usersCache && (now - _usersCacheTime < 20000) && !force) {
            return _usersCache;
        }
        const snapshot = await getDocs(collection(db, 'users'));
        const users = snapshot.docs.map(doc => doc.data());
        this.set(USERS_KEY, users);
        _usersCache = users;
        _usersCacheTime = now;
        return users;
    },

    // Get user by ID
    async getUserById(id) {
        if (_usersCache) {
            const found = _usersCache.find(u => u.id === id);
            if (found) return found;
        }
        const userDocRef = doc(db, 'users', id);
        const docSnap = await getDoc(userDocRef);
        return docSnap.exists() ? docSnap.data() : null;
    },

    // Get gamification data
    async getGameData(userId) {
        if (_allGameDataCache && (Date.now() - _allGameDataCacheTime < 10000)) {
            if (_allGameDataCache[userId]) {
                return {
                    balance: 0,
                    pendingBalance: 0,
                    totalEarnings: 0,
                    hasCreatorLicense: false,
                    isVIP: false,
                    withdrawals: [],
                    earningsHistory: [],
                    ..._allGameDataCache[userId]
                };
            }
        }
        const docRef = doc(db, 'gamification', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            let data = docSnap.data();
            
            // Auto-mature pending earnings older than 24 hours
            let updated = false;
            let balance = data.balance || 0;
            let pendingBalance = data.pendingBalance || 0;
            const history = data.earningsHistory || [];
            
            const now = new Date();
            const updatedHistory = history.map(item => {
                if (item.status === 'pending') {
                    const ageMs = now - new Date(item.timestamp);
                    if (ageMs >= 86400000) { // 24 hours
                        balance = parseFloat((balance + item.amount).toFixed(2));
                        pendingBalance = parseFloat(Math.max(0, pendingBalance - item.amount).toFixed(2));
                        updated = true;
                        return { ...item, status: 'available' };
                    }
                }
                return item;
            });
            
            if (updated) {
                data = {
                    ...data,
                    balance,
                    pendingBalance,
                    earningsHistory: updatedHistory
                };
                await setDoc(docRef, data, { merge: true });
                this.clearCache('gamification');
            }

            return {
                balance: 0,
                pendingBalance: 0,
                totalEarnings: 0,
                hasCreatorLicense: false,
                isVIP: false,
                withdrawals: [],
                earningsHistory: [],
                strikesCount: 0,
                banUntil: null,
                isTerminated: false,
                ...data
            };
        }
        return {
            rankPoints: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastChallengeDate: null,
            badges: [],
            completedByCategory: {},
            totalCompleted: 0,
            totalCreated: 0,
            balance: 0,
            pendingBalance: 0,
            totalEarnings: 0,
            hasCreatorLicense: false,
            isVIP: false,
            withdrawals: [],
            earningsHistory: [],
            strikesCount: 0,
            banUntil: null,
            isTerminated: false
        };
    },

    // Get all gamification data in one single read batch (for Leaderboard)
    async getAllGameData(force = false) {
        const now = Date.now();
        if (_allGameDataCache && (now - _allGameDataCacheTime < 10000) && !force) {
            return _allGameDataCache;
        }
        const snapshot = await getDocs(collection(db, 'gamification'));
        const map = {};
        snapshot.docs.forEach(doc => {
            map[doc.id] = doc.data();
        });
        _allGameDataCache = map;
        _allGameDataCacheTime = now;
        return map;
    },

    // Save gamification data
    async saveGameData(userId, data) {
        const docRef = doc(db, 'gamification', userId);
        await setDoc(docRef, data, { merge: true });
        this.clearCache('gamification');
    },

    // --- CHALLENGES ---

    async getChallenges(force = false) {
        const now = Date.now();
        if (_challengesCache && (now - _challengesCacheTime < 10000) && !force) {
            return _challengesCache;
        }
        const q = query(collection(db, 'challenges'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const chals = snapshot.docs.map(doc => doc.data());
        _challengesCache = chals;
        _challengesCacheTime = now;
        return chals;
    },

    async saveChallenges(chals) {
        for (const chal of chals) {
            const docRef = doc(db, 'challenges', chal.id);
            await setDoc(docRef, chal, { merge: true });
        }
        this.clearCache('challenges');
    },

    async addChallenge(chal) {
        const docRef = doc(db, 'challenges', chal.id);
        await setDoc(docRef, chal);
        this.clearCache('challenges');
    },

    async updateChallenge(chalId, fields) {
        const docRef = doc(db, 'challenges', chalId);
        await updateDoc(docRef, fields);
        this.clearCache('challenges');
    },

    async deleteChallenge(chalId) {
        const docRef = doc(db, 'challenges', chalId);
        await deleteDoc(docRef);
        
        const q = query(collection(db, 'proofs'), where('chalId', '==', chalId));
        const proofsSnapshot = await getDocs(q);
        for (const docItem of proofsSnapshot.docs) {
            await deleteDoc(docItem.ref);
        }
        this.clearCache('challenges');
        this.clearCache('proofs');
    },

    // --- PROOFS ---

    async getProofs(force = false) {
        const now = Date.now();
        if (_proofsCache && (now - _proofsCacheTime < 10000) && !force) {
            return _proofsCache;
        }
        const q = query(collection(db, 'proofs'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const proofs = snapshot.docs.map(doc => doc.data());
        _proofsCache = proofs;
        _proofsCacheTime = now;
        return proofs;
    },

    async saveProofs(proofs) {
        for (const proof of proofs) {
            const docRef = doc(db, 'proofs', proof.id);
            await setDoc(docRef, proof, { merge: true });
        }
        this.clearCache('proofs');
    },

    async addProof(proof) {
        const docRef = doc(db, 'proofs', proof.id);
        await setDoc(docRef, proof);
        this.clearCache('proofs');
    },

    async updateProof(proofId, fields) {
        const docRef = doc(db, 'proofs', proofId);
        await updateDoc(docRef, fields);
        this.clearCache('proofs');
    },

    // --- NOTIFICATIONS ---

    async addNotification(notif) {
        const docRef = doc(db, 'notification', notif.id);
        await setDoc(docRef, notif);
    },

    async updateNotification(notifId, fields) {
        const docRef = doc(db, 'notification', notifId);
        await updateDoc(docRef, fields);
    },

    async deleteNotification(notifId) {
        const docRef = doc(db, 'notification', notifId);
        await deleteDoc(docRef);
    },

    // --- FRIENDS & REQUESTS ---

    async getFriends(userId, force = false) {
        const now = Date.now();
        if (_friendsCache[userId] && (now - (_friendsCacheTime[userId] || 0) < 10000) && !force) {
            return _friendsCache[userId];
        }
        const docRef = doc(db, 'social', userId);
        const docSnap = await getDoc(docRef);
        const friends = docSnap.exists() ? (docSnap.data().friends || []) : [];
        _friendsCache[userId] = friends;
        _friendsCacheTime[userId] = now;
        return friends;
    },

    async getRequests(userId, force = false) {
        const now = Date.now();
        if (_requestsCache[userId] && (now - (_requestsCacheTime[userId] || 0) < 10000) && !force) {
            return _requestsCache[userId];
        }
        const snapshot = await getDocs(collection(db, 'social', userId, 'requests'));
        const requests = snapshot.docs.map(doc => doc.data());
        _requestsCache[userId] = requests;
        _requestsCacheTime[userId] = now;
        return requests;
    },

    async saveFriends(userId, friends) {
        const docRef = doc(db, 'social', userId);
        await setDoc(docRef, { friends }, { merge: true });
        _friendsCache[userId] = friends;
        _friendsCacheTime[userId] = Date.now();
    },

    // Accept friend request
    async acceptRequest(userId, fromId) {
        // 1. Add to friends list for both
        const myFriends = await this.getFriends(userId, true);
        const theirFriends = await this.getFriends(fromId, true);
        
        if (!myFriends.includes(fromId)) myFriends.push(fromId);
        if (!theirFriends.includes(userId)) theirFriends.push(userId);
        
        await this.saveFriends(userId, myFriends);
        await this.saveFriends(fromId, theirFriends);
        
        // 2. Delete request
        const reqDocRef = doc(db, 'social', userId, 'requests', fromId);
        await deleteDoc(reqDocRef);
        this.clearCache('requests');
    },

    // Send friend request
    async sendRequest(fromId, toId) {
        const reqDocRef = doc(db, 'social', toId, 'requests', fromId);
        await setDoc(reqDocRef, {
            fromId: fromId,
            date: new Date().toISOString()
        });
        this.clearCache('requests');
    },

    // Check if user is admin
    async isCurrentUserAdmin(userId) {
        if (!userId) return false;
        try {
            const adminDocRef = doc(db, 'admins', userId);
            const docSnap = await getDoc(adminDocRef);
            return docSnap.exists();
        } catch (error) {
            console.warn('Admin lookup failed:', error);
            return false;
        }
    },

    // Init user profile if missing (auto-heal)
    async checkAndAutoHealProfile(user) {
        if (!user) return null;
        let profile = await this.syncMyProfile(user.uid);
        if (!profile) {
            const username = user.email ? user.email.split('@')[0] : 'player';
            const fullName = user.displayName || username.charAt(0).toUpperCase() + username.slice(1);
            const initials = this.getInitials(fullName);
            const profileData = {
                id: user.uid,
                uid: user.uid,
                username: username.toLowerCase(),
                name: fullName,
                initials: initials,
                email: user.email,
                joinDate: new Date().toISOString()
            };
            try {
                const userDocRef = doc(db, 'users', user.uid);
                await setDoc(userDocRef, profileData);
                profile = profileData;
                this.set(MY_PROFILE_KEY, profile);
            } catch (e) {
                console.error("Failed to auto-heal profile:", e);
            }
        }

        // Check gamification data
        let gameData = null;
        try {
            gameData = await this.getGameData(user.uid);
        } catch (e) {}
        if (!gameData || gameData.rankPoints === undefined) {
            const initialGameData = {
                rankPoints: 0,
                currentStreak: 0,
                longestStreak: 0,
                lastChallengeDate: null,
                badges: [],
                completedByCategory: {},
                totalCompleted: 0,
                totalCreated: 0,
                balance: 0,
                pendingBalance: 0,
                totalEarnings: 0,
                hasCreatorLicense: false,
                isVIP: false,
                withdrawals: [],
                earningsHistory: [],
                strikesCount: 0,
                banUntil: null,
                isTerminated: false
            };
            try {
                const gameDocRef = doc(db, 'gamification', user.uid);
                await setDoc(gameDocRef, initialGameData);
            } catch (e) {
                console.error("Failed to auto-heal gamification:", e);
            }
        }
        return profile;
    },

    async distributeChallengeRewards(challengeId, participantId) {
        try {
            const chalDocRef = doc(db, 'challenges', challengeId);
            const chalSnap = await getDoc(chalDocRef);
            if (!chalSnap.exists()) return null;
            const challenge = chalSnap.data();

            if (!challenge.hasPrizePool) return null;

            // --- 1. Calculate and distribute Creator Reward (independent of winners limit) ---
            let creatorReward = 0.60;
            if (challenge.prizePool >= 5000) {
                creatorReward = 2.40;
            } else if (challenge.prizePool >= 1000) {
                creatorReward = 1.20;
            }
            
            const creatorId = challenge.creator;
            const creatorGameData = await this.getGameData(creatorId);
            const creatorEarningId = 'e' + Date.now() + 'c' + Math.random().toString(36).substr(2, 4);
            const creatorEarning = {
                id: creatorEarningId,
                amount: creatorReward,
                type: 'creator_reward',
                challengeId: challenge.id,
                challengeName: challenge.name,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            creatorGameData.pendingBalance = parseFloat(((creatorGameData.pendingBalance || 0) + creatorReward).toFixed(2));
            creatorGameData.totalEarnings = parseFloat(((creatorGameData.totalEarnings || 0) + creatorReward).toFixed(2));
            creatorGameData.earningsHistory = [creatorEarning, ...(creatorGameData.earningsHistory || [])];
            await this.saveGameData(creatorId, creatorGameData);

            // Send notification to creator
            const creatorNotifId = 'n' + Date.now() + 'cr';
            await this.addNotification({
                id: creatorNotifId,
                to: creatorId,
                from: 'system',
                fromName: 'DareVerse Payout',
                type: 'creator_payout',
                read: false,
                timestamp: new Date().toISOString(),
                amount: creatorReward,
                challengeName: challenge.name
            });

            // --- 2. Winner Split Logic (first-come first-served up to limit) ---
            const winners = challenge.winners || [];
            if (winners.includes(participantId)) {
                this.clearCache('gamification');
                return { share: 0, creatorReward };
            }
            
            const limit = challenge.winnersLimit || 5;
            if (winners.length >= limit) {
                this.clearCache('gamification');
                return { share: 0, creatorReward }; // No prize money, but creator was paid
            }

            // Register winner
            const updatedWinners = [...winners, participantId];
            await updateDoc(chalDocRef, { winners: updatedWinners });
            this.clearCache('challenges');

            // Calculate share
            const share = parseFloat((challenge.prizePool / limit).toFixed(2));
            const partGameData = await this.getGameData(participantId);
            const earningId = 'e' + Date.now() + Math.random().toString(36).substr(2, 4);
            const newEarning = {
                id: earningId,
                amount: share,
                type: 'prize_share',
                challengeId: challenge.id,
                challengeName: challenge.name,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            partGameData.pendingBalance = parseFloat(((partGameData.pendingBalance || 0) + share).toFixed(2));
            partGameData.totalEarnings = parseFloat(((partGameData.totalEarnings || 0) + share).toFixed(2));
            partGameData.earningsHistory = [newEarning, ...(partGameData.earningsHistory || [])];
            await this.saveGameData(participantId, partGameData);

            this.clearCache('gamification');
            return { share, creatorReward };
        } catch (error) {
            console.error("Error distributing rewards:", error);
            return null;
        }
    },

    async addStrikeToUser(userId) {
        try {
            const data = await this.getGameData(userId);
            const currentStrikes = (data.strikesCount || 0) + 1;
            data.strikesCount = currentStrikes;
            data.currentStreak = 0; // Reset streak on any strike

            if (currentStrikes === 1) {
                // Strike 1: 1-week ban
                const banDate = new Date();
                banDate.setDate(banDate.getDate() + 7);
                data.banUntil = banDate.toISOString();
            } else if (currentStrikes === 2) {
                // Strike 2: Permanent app ban
                data.banUntil = 'permanent';
            } else if (currentStrikes >= 3) {
                // Strike 3: Account termination
                data.isTerminated = true;
                data.banUntil = 'terminated';
            }

            await this.saveGameData(userId, data);
            
            const userDocRef = doc(db, 'users', userId);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                await updateDoc(userDocRef, { 
                    isTerminated: data.isTerminated || false,
                    banUntil: data.banUntil || null
                });
            }
            this.clearCache('users');
            this.clearCache('gamification');
            return data;
        } catch (error) {
            console.error("Error adding strike:", error);
            return null;
        }
    },

    async adminUpdateUserSafety(userId, fields) {
        try {
            const data = await this.getGameData(userId);
            const updatedData = { ...data, ...fields };
            await this.saveGameData(userId, updatedData);

            const userDocRef = doc(db, 'users', userId);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                await updateDoc(userDocRef, {
                    isTerminated: updatedData.isTerminated || false,
                    banUntil: updatedData.banUntil || null
                });
            }
            this.clearCache('users');
            this.clearCache('gamification');
            return updatedData;
        } catch (error) {
            console.error("Error in admin safety update:", error);
            return null;
        }
    },

    // Helper to get name initials
    getInitials(name) {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '??';
        return parts.map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
};
