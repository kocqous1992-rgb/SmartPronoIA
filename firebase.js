import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithRedirect, 
    getRedirectResult, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    increment 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDmu3fAgmDBYblNZNDlb92zml1FI9nE8Cg",
    authDomain: "smart-prono-ia.firebaseapp.com",
    projectId: "smart-prono-ia",
    storageBucket: "smart-prono-ia.firebasestorage.app",
    messagingSenderId: "23720203291",
    appId: "1:23720203291:web:c8c492b07ecdbba8fb94be"
};

// Initialisation
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export let currentUser = null;

// Gérer le retour de redirection Google
getRedirectResult(auth).then(async (result) => {
    if (result && result.user) {
        await syncUserData(result.user);
    }
}).catch((error) => {
    console.error("Erreur redirection :", error);
});

// Écouter le changement d'état de connexion
onAuthStateChanged(auth, async (user) => {
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');

    if (user) {
        currentUser = user;
        if (btnLogin) btnLogin.classList.add('hidden');
        if (btnLogout) btnLogout.classList.remove('hidden');
        await syncUserData(user);
    } else {
        currentUser = null;
        if (btnLogin) btnLogin.classList.remove('hidden');
        if (btnLogout) btnLogout.classList.add('hidden');
        updateCreditsUI(0);
    }
});

// Connexion Google via Redirection (Parfait sur mobile)
window.loginWithGoogle = async function() {
    try {
        await signInWithRedirect(auth, googleProvider);
    } catch (error) {
        console.error("Erreur de connexion Google :", error);
        alert("Erreur lors de la connexion : " + error.message);
    }
};

// Déconnexion
window.logoutUser = async function() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erreur de déconnexion :", error);
    }
};

// Synchroniser les jetons dans Firestore
async function syncUserData(user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        await setDoc(userRef, {
            email: user.email,
            credits: 10,
            createdAt: new Date().toISOString()
        });
        updateCreditsUI(10);
    } else {
        const data = userSnap.data();
        updateCreditsUI(data.credits);
    }
}

// Déduire 1 jeton
export async function consumeCredit() {
    if (!currentUser) return false;

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().credits > 0) {
        await updateDoc(userRef, { credits: increment(-1) });
        updateCreditsUI(userSnap.data().credits - 1);
        return true;
    }
    return false;
}

function updateCreditsUI(amount) {
    const creditElem = document.getElementById('credits-count');
    if (creditElem) creditElem.innerText = amount;
}