import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyYOUR_API_KEY",
    authDomain: "foot-prediction-pro.firebaseapp.com",
    projectId: "foot-prediction-pro",
    storageBucket: "foot-prediction-pro.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);