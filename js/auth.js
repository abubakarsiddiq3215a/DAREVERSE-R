/* ============================================
   DAREVERSE — Authentication (Firebase)
   ============================================ */

const Auth = {
    // Check if user is logged in (sync check for UI)
    isLoggedIn() {
        return !!auth.currentUser;
    },

    // Get current user object
    me() {
        const user = auth.currentUser;
        if (!user) return null;
        
        // We retrieve the cached profile data from localStorage for speed
        // but it's kept in sync via Firestore listeners in data.js
        const profile = DB.get('dv_my_profile') || {};
        return {
            uid: user.uid,
            email: user.email,
            id: user.uid, // compatible with existing code
            name: user.displayName || 'Player',
            username: user.email ? user.email.split('@')[0] : 'player',
            initials: 'PL',
            ...profile
        };
    },

    // Login
    async login(email, password) {
        try {
            // In a real app, users might want to log in via username.
            // For simplicity with Firebase Auth, we'll use email.
            // If the user entered a username, we'd normally lookup the email first.
            // For now, let's assume the user enters their email or we use username@dareverse.com
            const emailToUse = email.includes('@') ? email : `${email.toLowerCase()}@dareverse.com`;
            
            const userCredential = await auth.signInWithEmailAndPassword(emailToUse, password);
            
            // Fetch profile data to cache it
            await DB.syncMyProfile(userCredential.user.uid);
            
            return { success: true };
        } catch (error) {
            console.error("Login error:", error);
            let msg = "Invalid credentials";
            if (error.code === 'auth/user-not-found') msg = "User not found";
            if (error.code === 'auth/wrong-password') msg = "Incorrect password";
            return { success: false, error: msg };
        }
    },

    // Register
    async register(username, password, fullName) {
        try {
            const email = `${username.toLowerCase()}@dareverse.com`;
            
            // 1. Create user in Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user.uid;

            // 2. Create profile in Firestore
            const initials = DB.getInitials(fullName);
            const profileData = {
                id: uid,
                uid: uid,
                username: username.toLowerCase(),
                name: fullName,
                initials: initials,
                email: email,
                joinDate: new Date().toISOString()
            };

            await db.collection('users').doc(uid).set(profileData);
            
            // 3. Initialize gamification data in Firestore
            const initialGameData = {
                rankPoints: 0,
                currentStreak: 0,
                longestStreak: 0,
                lastChallengeDate: null,
                badges: [],
                completedByCategory: {},
                totalCompleted: 0,
                totalCreated: 0
            };
            await db.collection('gamification').doc(uid).set(initialGameData);

            // Cache locally
            DB.set('dv_my_profile', profileData);

            return { success: true };
        } catch (error) {
            console.error("Registration error:", error);
            let msg = "Registration failed";
            if (error.code === 'auth/email-already-in-use') msg = "Username already taken";
            return { success: false, error: msg };
        }
    },

    // Logout
    async logout() {
        try {
            await auth.signOut();
            DB.remove('dv_my_profile');
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Logout error:", error);
        }
    },

    // Require Auth middleware
    requireAuth() {
        // This is tricky with Firebase because auth state is async.
        // We check if we have a cached session or wait for the observer.
        if (!this.isLoggedIn() && !DB.get('dv_my_profile')) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },

    // Listen for auth changes
    initAuthListener(callback) {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is signed in
                let profile = await DB.syncMyProfile(user.uid);
                if (!profile) {
                    // Profile does not exist in Firestore! Let's auto-heal/create it now.
                    const username = user.email ? user.email.split('@')[0] : 'player';
                    const fullName = user.displayName || username.charAt(0).toUpperCase() + username.slice(1);
                    const initials = DB.getInitials(fullName);
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
                        await db.collection('users').doc(user.uid).set(profileData);
                        profile = await DB.syncMyProfile(user.uid);
                    } catch (e) {
                        console.error("Failed to auto-heal profile:", e);
                    }
                }

                // Check and auto-heal gamification data if missing
                let gameData = null;
                try {
                    gameData = await DB.getGameData(user.uid);
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
                        totalCreated: 0
                    };
                    try {
                        await db.collection('gamification').doc(user.uid).set(initialGameData);
                    } catch (e) {
                        console.error("Failed to auto-heal gamification:", e);
                    }
                }

                if (callback) callback(user);
            } else {
                // User is signed out
                if (window.location.pathname.includes('app.html')) {
                    window.location.href = 'index.html';
                }
            }
        });
    }
};
