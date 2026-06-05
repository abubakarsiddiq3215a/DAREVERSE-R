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

// Enable multi-tab offline persistence (modern API for compat SDK v10)
// Using enableMultiTabIndexedDbPersistence for multi-tab support
db.enableMultiTabIndexedDbPersistence().catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open; persistence only works in one tab at a time.
        console.warn('Firebase persistence failed: Multiple tabs open. Falling back to memory cache.');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required.
        console.warn('Firebase persistence is not supported by this browser.');
    }
});
