import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyD9o0U374SsoV6-CFdTZ7t4-byW3UBfMKI",
    authDomain: "dareverse-865c9.firebaseapp.com",
    projectId: "dareverse-865c9",
    storageBucket: "dareverse-865c9.firebasestorage.app",
    messagingSenderId: "173463184643",
    appId: "1:173463184643:web:fce7c582ee1d2eb0923536"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
