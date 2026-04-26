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

// Latest Firebase 10.x way to enable persistence and remove console warnings
// This replaces the old db.settings and db.enablePersistence calls
db.settings({
    experimentalForceLongPolling: true, // Helps with some network environments
    merge: true // Removes the "overriding host" warning
});

// Enable persistence the older but stable compat way, ignoring the deprecation notice 
// as the "new" way is mostly for the Modular SDK, but we'll clean up the settings call.
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Firebase persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Firebase persistence is not supported by this browser');
    }
});
