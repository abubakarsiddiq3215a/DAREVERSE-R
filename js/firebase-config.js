/* ============================================
   DAREVERSE — Firebase Configuration
   ============================================ */

// Replace these with your own config from the Firebase Console
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

// Enable persistence (offline support) — using newer API to avoid deprecation warning
db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Firebase persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Firebase persistence is not supported by this browser');
    }
});
