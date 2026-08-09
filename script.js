import { db, currentUser, consumeCredit } from "./firebase.js";

// API ScoreBat (Accès 100% gratuit et sans blocage CORS)
const API_URL = "https://www.scorebat.com/video-api/v3/feed/?token=MTY4NTc1XzE3MjM0Njk2MDNfOGM4M2YxMWRmZjg3YTc3Y2Y4YTYyY2MxZmI4MGFhMmM4YWJmNTM1OQ==";

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadRealMatches();
    setupEventListeners();
}

// 1. Charger les matchs réels
async function loadRealMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">⏳ Chargement des matchs en direct...</div>`;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Erreur API");

        const data = await response.json();
        const matches = data.response || [];

        renderMatches(matches, container);
    } catch (error) {
        console.error("Erreur chargement matchs :", error);
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #ef4444;">❌ Erreur de chargement des matchs.</div>`;
    }
}

// 2. Afficher la liste des matchs
function renderMatches(matches, container) {
    if (!matches || matches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match disponible pour le moment.</div>`;
        return;
    }

    // Afficher les 10 premiers matchs
    const topMatches = matches.slice(0, 10);

    container.innerHTML = topMatches.map(match => {
        const title = match.title; // Format: "Équipe A vs Équipe B"
        const league = match.competition || "Football";

        return `
            <div style="background: #0f172a; margin: 8px 0; padding: 10px; border-radius: 6px; border: 1px solid #1e293b;">
                <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">${league}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; font-weight: 600; color: #f8fafc;">
                    <span>${title}</span>
                    <span style="background: #22c55e; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">EN DIRECT</span>
                </div>
            </div>
        `;
    }).join('');
}

// 3. Gestion du bouton "Générer l'Analyse"
async function handleGenerateAnalysis() {
    if (!currentUser) {
        alert("Veuillez vous connecter avec votre compte Google.");
        return;
    }

    const hasCredit = await consumeCredit();
    if (!hasCredit) {
        alert("Vous n'avez pas assez de jetons !");
        return;
    }

    alert("Analyse en cours de génération... (-1 Jeton)");
}

// 4. Écouteurs d'événements
function setupEventListeners() {
    // Bouton de génération
    const btnGenerate = document.getElementById('btn-generate') || document.querySelector('button');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', handleGenerateAnalysis);
    }

    // Onglets de navigation
    const tabPronos = document.getElementById('tab-pronos');
    const tabDirect = document.getElementById('tab-direct');

    if (tabPronos) tabPronos.addEventListener('click', () => loadRealMatches());
    if (tabDirect) tabDirect.addEventListener('click', () => loadRealMatches());
}