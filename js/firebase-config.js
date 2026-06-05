/* ============================================
   DAREVERSE — Firebase Configuration
   ============================================ */

const firebaseConfig = {
    apiKey: "AIzaSyD9o0U374SsoV6-CFdTZ7t4-byW3UBfMKI",
    authDomain: "dareverse-865c9.firebaseapp.com",
    projectId: "dareverse-865c9",
    storageBucket: "dareverse-865c9.firebasestorage.app",
    messagingSenderId: "173463184643",
    appId: "1:173463184643:web:fce7c582ee1d2eb0923536"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Shortcuts
const auth = firebase.auth();
const db = firebase.firestore();

// Offline persistence is disabled to avoid deprecation warnings from the Firebase v10 compat SDK.
// If offline support is needed in the future, we recommend migrating to the modern modular SDK.
