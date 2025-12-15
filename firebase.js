
// Firebase App (Grundlage)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

// Firebase Auth (Login)
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Firestore (Datenbank)
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase-Konfiguration (aus der Konsole)
const firebaseConfig = {
    apiKey: "AIzaSyAhifQFgx0-knxwXx0t5aXdqIIsNZBWuT0",
    authDomain: "listen-app-sander.firebaseapp.com",
    projectId: "listen-app-sander",
    storageBucket: "listen-app-sander.firebasestorage.app",
    messagingSenderId: "533565907496",
    appId: "1:533565907496:web:d18082864e0346f4f78b1d"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);

// Auth & Firestore initialisieren
const auth = getAuth(app);
const db = getFirestore(app);

// Exportieren für script.js
export { app, auth, db };
