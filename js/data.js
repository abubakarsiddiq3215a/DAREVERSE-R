/* ============================================
   DAREVERSE — Data / State Management (Firestore)
   ============================================ */

const DB = {
    // Keys for local caching
    USERS: 'dv_users',
    CHALLENGES: 'dv_challenges',
    PROOFS: 'dv_proofs',
    MY_PROFILE: 'dv_my_profile',
    GAME_DATA: 'dv_game_',

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

    // --- IN-MEMORY CACHE ---
    _usersCache: null,
    _usersCacheTime: 0,
    _friendsCache: {},
    _friendsCacheTime: {},
    _requestsCache: {},
    _requestsCacheTime: {},
    _challengesCache: null,
    _challengesCacheTime: 0,
    _proofsCache: null,
    _proofsCacheTime: 0,
    _allGameDataCache: null,
    _allGameDataCacheTime: 0,

    clearCache(type) {
        const now = Date.now();
        if (!type || type === 'all') {
            this._usersCache = null;
            this._usersCacheTime = 0;
            this._friendsCache = {};
            this._friendsCacheTime = {};
            this._requestsCache = {};
            this._requestsCacheTime = {};
            this._challengesCache = null;
            this._challengesCacheTime = 0;
            this._proofsCache = null;
            this._proofsCacheTime = 0;
            this._allGameDataCache = null;
            this._allGameDataCacheTime = 0;
        } else if (type === 'challenges') {
            this._challengesCache = null;
            this._challengesCacheTime = 0;
        } else if (type === 'proofs') {
            this._proofsCache = null;
            this._proofsCacheTime = 0;
        } else if (type === 'users') {
            this._usersCache = null;
            this._usersCacheTime = 0;
        } else if (type === 'friends') {
            this._friendsCache = {};
            this._friendsCacheTime = {};
        } else if (type === 'requests') {
            this._requestsCache = {};
            this._requestsCacheTime = {};
        } else if (type === 'gamification') {
            this._allGameDataCache = null;
            this._allGameDataCacheTime = 0;
        }
    },

    // --- FIRESTORE SYNC ---

    // Sync my profile
    async syncMyProfile(uid) {
        if (!uid) return null;
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            this.set(this.MY_PROFILE, data);
            return data;
        }
        return null;
    },

    // Get all users (cached or fresh)
    async getUsers(force = false) {
        const now = Date.now();
        if (this._usersCache && (now - this._usersCacheTime < 20000) && !force) {
            return this._usersCache;
        }
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => doc.data());
        this.set(this.USERS, users);
        this._usersCache = users;
        this._usersCacheTime = now;
        return users;
    },

    // Get user by ID
    async getUserById(id) {
        // Find in local cache if available
        if (this._usersCache) {
            const found = this._usersCache.find(u => u.id === id);
            if (found) return found;
        }
        const doc = await db.collection('users').doc(id).get();
        return doc.exists ? doc.data() : null;
    },

    // Get gamification data
    async getGameData(userId) {
        // If all game data cache is fresh, check there first
        if (this._allGameDataCache && (Date.now() - this._allGameDataCacheTime < 10000)) {
            if (this._allGameDataCache[userId]) {
                return this._allGameDataCache[userId];
            }
        }
        const doc = await db.collection('gamification').doc(userId).get();
        if (doc.exists) {
            return doc.data();
        }
        // Return default if not found
        return {
            rankPoints: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastChallengeDate: null,
            badges: [],
            completedByCategory: {},
            totalCompleted: 0,
            totalCreated: 0
        };
    },

    // Get all gamification data in one single read batch (for Leaderboard)
    async getAllGameData(force = false) {
        const now = Date.now();
        if (this._allGameDataCache && (now - this._allGameDataCacheTime < 10000) && !force) {
            return this._allGameDataCache;
        }
        const snapshot = await db.collection('gamification').get();
        const map = {};
        snapshot.docs.forEach(doc => {
            map[doc.id] = doc.data();
        });
        this._allGameDataCache = map;
        this._allGameDataCacheTime = now;
        return map;
    },

    // Save gamification data
    async saveGameData(userId, data) {
        await db.collection('gamification').doc(userId).set(data, { merge: true });
        this.clearCache('gamification');
    },

    // --- CHALLENGES ---

    async getChallenges(force = false) {
        const now = Date.now();
        if (this._challengesCache && (now - this._challengesCacheTime < 10000) && !force) {
            return this._challengesCache;
        }
        const snapshot = await db.collection('challenges').orderBy('date', 'desc').get();
        const chals = snapshot.docs.map(doc => doc.data());
        this.set(this.CHALLENGES, chals);
        this._challengesCache = chals;
        this._challengesCacheTime = now;
        return chals;
    },

    async saveChallenges(chals) {
        for (const chal of chals) {
            await db.collection('challenges').doc(chal.id).set(chal, { merge: true });
        }
        this.clearCache('challenges');
    },

    async addChallenge(chal) {
        await db.collection('challenges').doc(chal.id).set(chal);
        this.clearCache('challenges');
    },

    async updateChallenge(chalId, fields) {
        await db.collection('challenges').doc(chalId).update(fields);
        this.clearCache('challenges');
    },

    async deleteChallenge(chalId) {
        await db.collection('challenges').doc(chalId).delete();
        const proofsSnapshot = await db.collection('proofs').where('chalId', '==', chalId).get();
        for (const doc of proofsSnapshot.docs) {
            await doc.ref.delete();
        }
        this.clearCache('challenges');
        this.clearCache('proofs');
    },

    // --- PROOFS ---

    async getProofs(force = false) {
        const now = Date.now();
        if (this._proofsCache && (now - this._proofsCacheTime < 10000) && !force) {
            return this._proofsCache;
        }
        const snapshot = await db.collection('proofs').orderBy('date', 'desc').get();
        const proofs = snapshot.docs.map(doc => doc.data());
        this._proofsCache = proofs;
        this._proofsCacheTime = now;
        return proofs;
    },

    async saveProofs(proofs) {
        for (const proof of proofs) {
            await db.collection('proofs').doc(proof.id).set(proof, { merge: true });
        }
        this.clearCache('proofs');
    },

    async addProof(proof) {
        await db.collection('proofs').doc(proof.id).set(proof);
        this.clearCache('proofs');
    },

    async updateProof(proofId, fields) {
        await db.collection('proofs').doc(proofId).update(fields);
        this.clearCache('proofs');
    },

    // --- FRIENDS & REQUESTS ---

    async getFriends(userId, force = false) {
        const now = Date.now();
        if (this._friendsCache[userId] && (now - (this._friendsCacheTime[userId] || 0) < 10000) && !force) {
            return this._friendsCache[userId];
        }
        const doc = await db.collection('social').doc(userId).get();
        const friends = doc.exists ? (doc.data().friends || []) : [];
        this._friendsCache[userId] = friends;
        this._friendsCacheTime[userId] = now;
        return friends;
    },

    async getRequests(userId, force = false) {
        const now = Date.now();
        if (this._requestsCache[userId] && (now - (this._requestsCacheTime[userId] || 0) < 10000) && !force) {
            return this._requestsCache[userId];
        }
        const snapshot = await db.collection('social').doc(userId).collection('requests').get();
        const requests = snapshot.docs.map(doc => doc.data());
        this._requestsCache[userId] = requests;
        this._requestsCacheTime[userId] = now;
        return requests;
    },

    async saveFriends(userId, friends) {
        await db.collection('social').doc(userId).set({ friends }, { merge: true });
        this._friendsCache[userId] = friends;
        this._friendsCacheTime[userId] = Date.now();
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
        await db.collection('social').doc(userId).collection('requests').doc(fromId).delete();
        this.clearCache('requests');
    },

    // Send friend request
    async sendRequest(fromId, toId) {
        await db.collection('social').doc(toId).collection('requests').doc(fromId).set({
            fromId: fromId,
            date: new Date().toISOString()
        });
        this.clearCache('requests');
    },

    // --- UTILS ---

    getInitials(name) {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '??';
        return parts.map(n => n[0]).join('').slice(0, 2).toUpperCase();
    },

    // Demo data init (Only if needed, but Firebase usually seeds differently)
    async initDemoData() {
        // We'll skip this for now as Firebase is a live DB.
        // We can create a script to seed it if the user wants.
    }
};
