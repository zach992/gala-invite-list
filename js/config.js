// Firebase Configuration
// Replace these values with your Firebase project configuration
// Get them from Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
    apiKey: "AIzaSyCR0alT_htxmM79i-1NWjXKt82C0Fbmzn4",
    authDomain: "gala-invite-list-2026.firebaseapp.com",
    projectId: "gala-invite-list-2026",
    storageBucket: "gala-invite-list-2026.firebasestorage.app",
    messagingSenderId: "45295474295",
    appId: "1:45295474295:web:566eb85f8b01a710b75872"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
}

// Initialize Firestore
const db = firebase.firestore();
