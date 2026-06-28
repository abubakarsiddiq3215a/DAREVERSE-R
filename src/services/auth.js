import { auth } from './firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { DB } from './db';

const MY_PROFILE_KEY = 'dv_my_profile';

export const Auth = {
    // Check if user is logged in (sync check for UI)
    isLoggedIn() {
        return !!auth.currentUser;
    },

    // Get current user object
    me() {
        const user = auth.currentUser;
        if (!user) return null;
        
        const profile = DB.get(MY_PROFILE_KEY) || {};
        return {
            uid: user.uid,
            email: user.email,
            id: user.uid, // compatible with legacy
            name: user.displayName || 'Player',
            username: user.email ? user.email.split('@')[0] : 'player',
            initials: 'PL',
            ...profile
        };
    },

    // Login
    async login(email, password) {
        try {
            const emailToUse = email.includes('@') ? email : `${email.toLowerCase()}@dareverse.com`;
            const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
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
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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

            await setDoc(doc(db, 'users', uid), profileData);
            
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
            await setDoc(doc(db, 'gamification', uid), initialGameData);

            // Cache locally
            DB.set(MY_PROFILE_KEY, profileData);

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
            await signOut(auth);
            DB.remove(MY_PROFILE_KEY);
        } catch (error) {
            console.error("Logout error:", error);
        }
    },

    // Listen for auth changes
    initAuthListener(callback) {
        return onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in
                const profile = await DB.checkAndAutoHealProfile(user);
                if (callback) callback(user, profile);
            } else {
                // User is signed out
                if (callback) callback(null, null);
            }
        });
    }
};
