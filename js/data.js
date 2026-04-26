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
    async getUsers() {
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => doc.data());
        this.set(this.USERS, users);
        return users;
    },

    // Get user by ID
    async getUserById(id) {
        const doc = await db.collection('users').doc(id).get();
        return doc.exists ? doc.data() : null;
    },

    // Get gamification data
    async getGameData(userId) {
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

    // Save gamification data
    async saveGameData(userId, data) {
        await db.collection('gamification').doc(userId).set(data, { merge: true });
    },

    // --- CHALLENGES ---

    async getChallenges() {
        const snapshot = await db.collection('challenges').orderBy('date', 'desc').get();
        const chals = snapshot.docs.map(doc => doc.data());
        this.set(this.CHALLENGES, chals);
        return chals;
    },

    async saveChallenges(chals) {
        // In Firestore, we usually update individual docs, but the existing code passes an array.
        // For compatibility, we'll loop or just use the new addChallenge method.
        // But for now, we'll implement a helper.
        for (const chal of chals) {
            await db.collection('challenges').doc(chal.id).set(chal, { merge: true });
        }
    },

    async addChallenge(chal) {
        await db.collection('challenges').doc(chal.id).set(chal);
    },

    // --- PROOFS ---

    async getProofs() {
        const snapshot = await db.collection('proofs').orderBy('date', 'desc').get();
        return snapshot.docs.map(doc => doc.data());
    },

    async saveProofs(proofs) {
        for (const proof of proofs) {
            await db.collection('proofs').doc(proof.id).set(proof, { merge: true });
        }
    },

    async addProof(proof) {
        await db.collection('proofs').doc(proof.id).set(proof);
    },

    // --- FRIENDS & REQUESTS ---

    async getFriends(userId) {
        const doc = await db.collection('social').doc(userId).get();
        if (doc.exists) return doc.data().friends || [];
        return [];
    },

    async getRequests(userId) {
        const snapshot = await db.collection('social').doc(userId).collection('requests').get();
        return snapshot.docs.map(doc => doc.data());
    },

    async saveFriends(userId, friends) {
        await db.collection('social').doc(userId).set({ friends }, { merge: true });
    },

    // Accept friend request
    async acceptRequest(userId, fromId) {
        // 1. Add to friends list for both
        const myFriends = await this.getFriends(userId);
        const theirFriends = await this.getFriends(fromId);
        
        if (!myFriends.includes(fromId)) myFriends.push(fromId);
        if (!theirFriends.includes(userId)) theirFriends.push(userId);
        
        await this.saveFriends(userId, myFriends);
        await this.saveFriends(fromId, theirFriends);
        
        // 2. Delete request
        await db.collection('social').doc(userId).collection('requests').doc(fromId).delete();
    },

    // Send friend request
    async sendRequest(fromId, toId) {
        await db.collection('social').doc(toId).collection('requests').doc(fromId).set({
            fromId: fromId,
            date: new Date().toISOString()
        });
    },

    // --- UTILS ---

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    },

    // Demo data init (Only if needed, but Firebase usually seeds differently)
    async initDemoData() {
        // We'll skip this for now as Firebase is a live DB.
        // We can create a script to seed it if the user wants.
    }
};
