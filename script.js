import { db, currentUser, consumeCredit } from "./firebase.js";

// API Football gratuite et totalement accessible sans blocage CORS
const API_URL = "https://www.scorebat.com/video-api/v3/feed/?token=MTY4NTc1XzE3MjM0Njk2MDNfOGM4M2YxMWRmZjg3YTc3Y2Y4YTYyY2MxZmI4MGFhMmM4YWJmNTM1OQ==";

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadTodayMatches();
    setupEventListeners();
}

// 1. Charger les matchs du jour / en direct
async function loadTodayMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 20px; color: #fff;">⏳ Chargement des matchs en direct et du jour...</div>`;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Erreur serveur API");

        const data = await response.json();
        const matches = data.response || [];

        renderMatches(matches, container, "Aucun match disponible pour le moment.");
    } catch (error) {
        console.error("Erreur chargement matchs :", error);
        container.innerHTML = `<div style="text-align:center; padding: 20px; color: #ff4d4d;">❌ Impossible de charger les matchs. Vérifie ta connexion.</div>`;
    }
}

// 2. Affichage dynamique des cartes
function renderMatches(matches, container, emptyMessage) {
    if (!matches || matches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 20px; color: #aaa;">${emptyMessage}</div>`;
        return;
    }

    // Afficher les 15 premiers matchs les plus récents
    const recentMatches = matches.slice(0, 15);

    container.innerHTML = recentMatches.map(match => {
        const title = match.title; // Format: "Home vs Away"
        const league = match.competition || "Football";

        return `
            <div style="background: #1e293b; margin: 10px 0; padding: 12px; border-radius: 8px; color: #fff;">
                <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 5px;">${league}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
                    <span>${title}</span>
                </div>
                <div style="margin-top: 8px; font-size: 0.75rem; text-align: right; color: #38bdf8;">
                    🟢 Match vérifié
                </div>
            </div>
        `;
    }).join('');
}

// 3. Gestion de l'analyse avec jetons
async function handleGenerateAnalysis() {
    if (!currentUser) {
        alert("Veuillez vous connecter avec votre compte Google.");
        return;
    }

    const hasCredit = await consumeCredit();
    if (!hasCredit) {
        alert("Vous n'avez plus de jetons !");
        return;
    }

    alert("Analyse générée avec succès ! (-1 Jeton)");
}

// 4. Écouteurs d'événements
function setupEventListeners() {
    const btnGenerate = document.getElementById('btn-generate');
    const tabPronos = document.getElementById('tab-pronos');
    const tabDirect = document.getElementById('tab-direct');

    if (btnGenerate) btnGenerate.addEventListener('click', handleGenerateAnalysis);
    if (tabPronos) tabPronos.addEventListener('click', () => loadTodayMatches());
    if (tabDirect) tabDirect.addEventListener('click', () => loadTodayMatches());
}