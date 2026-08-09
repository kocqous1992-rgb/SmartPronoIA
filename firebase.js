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

// Connexion Google via Redirection
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

// Synchroniser les jetons dans Firestore (Collection 'users')
async function syncUserData(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Création automatique du profil avec 10 jetons
            await setDoc(userRef, {
                email: user.email,
                credits: 10,
                createdAt: new Date().toISOString()
            });
            updateCreditsUI(10);
        } else {
            const data = userSnap.data();
            // Si le champ credits n'existe pas encore
            if (data.credits === undefined) {
                await updateDoc(userRef, { credits: 10 });
                updateCreditsUI(10);
            } else {
                updateCreditsUI(data.credits);
            }
        }
    } catch (error) {
        console.error("Erreur de synchronisation Firestore :", error);
        // Affichage de secours pour vérifier si l'utilisateur est connecté
        updateCreditsUI(10);
    }
}

// Déduire 1 jeton lors d'une analyse
export async function consumeCredit() {
    if (!currentUser) return false;

    try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const currentCredits = userSnap.data().credits || 0;
            if (currentCredits > 0) {
                await updateDoc(userRef, { credits: increment(-1) });
                updateCreditsUI(currentCredits - 1);
                return true;
            }
        }
    } catch (error) {
        console.error("Erreur lors de la déduction de jeton :", error);
    }
    return false;
}

function updateCreditsUI(amount) {
    const creditElem = document.getElementById('credits-count');
    if (creditElem) creditElem.innerText = amount;
}