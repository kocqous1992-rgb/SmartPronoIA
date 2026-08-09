import { db, currentUser, consumeCredit } from "./firebase.js";

// Clé et configuration Football-Data.org
const API_KEY = "3e7eafe1ea6045bc97395ef3cdbebf1f"; 
const API_URL = "https://api.football-data.org/v4";

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadTodayMatches();
    setupEventListeners();
}

// Obtenir la date du jour exacte (YYYY-MM-DD)
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 1. Charger UNIQUEMENT les matchs du jour réel
async function loadTodayMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div class="loading" style="text-align:center; padding: 20px; color: #fff;">⏳ Chargement des matchs du jour...</div>`;

    const today = getTodayDate();

    try {
        const response = await fetch(`${API_URL}/matches?dateFrom=${today}&dateTo=${today}`, {
            method: "GET",
            headers: {
                "X-Auth-Token": API_KEY
            }
        });

        if (!response.ok) throw new Error("Erreur serveur API");

        const data = await response.json();
        const matches = data.matches || [];

        renderMatches(matches, container, "Aucun match prévu aujourd'hui.");
    } catch (error) {
        console.error("Erreur chargement matchs du jour:", error);
        container.innerHTML = `<div class="error" style="text-align:center; padding: 20px; color: #ff4d4d;">❌ Impossible de charger les matchs du jour.</div>`;
    }
}

// 2. Charger UNIQUEMENT les matchs actuellement en direct
async function loadLiveMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div class="loading" style="text-align:center; padding: 20px; color: #fff;">⚡ Recherche des matchs en direct...</div>`;

    try {
        const response = await fetch(`${API_URL}/matches?status=IN_PLAY`, {
            method: "GET",
            headers: {
                "X-Auth-Token": API_KEY
            }
        });

        if (!response.ok) throw new Error("Erreur serveur API");

        const data = await response.json();
        const liveMatches = data.matches || [];

        renderMatches(liveMatches, container, "Aucun match actuellement en direct.");
    } catch (error) {
        console.error("Erreur chargement matchs en direct:", error);
        container.innerHTML = `<div class="error" style="text-align:center; padding: 20px; color: #ff4d4d;">❌ Impossible de charger les matchs en direct.</div>`;
    }
}

// 3. Rendu HTML des cartes de matchs
function renderMatches(matches, container, emptyMessage) {
    if (matches.length === 0) {
        container.innerHTML = `<div class="empty" style="text-align:center; padding: 20px; color: #aaa;">${emptyMessage}</div>`;
        return;
    }

    container.innerHTML = matches.map(match => {
        const homeTeam = match.homeTeam.shortName || match.homeTeam.name;
        const awayTeam = match.awayTeam.shortName || match.awayTeam.name;
        const status = match.status; // TIMED, IN_PLAY, FINISHED, PAUSED
        const league = match.competition.name;

        let statusText = status;
        if (status === 'IN_PLAY') statusText = '🔴 EN DIRECT';
        else if (status === 'FINISHED') statusText = 'FT';
        else if (status === 'TIMED') statusText = 'Programmé';

        return `
            <div class="match-card" style="background: #1e293b; margin: 10px 0; padding: 12px; border-radius: 8px; color: #fff;">
                <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 5px;">${league}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
                    <span>${homeTeam}</span>
                    <span style="color: #38bdf8; font-size: 0.8rem;">VS</span>
                    <span>${awayTeam}</span>
                </div>
                <div style="margin-top: 8px; font-size: 0.75rem; text-align: right; color: #e2e8f0;">
                    ${statusText}
                </div>
            </div>
        `;
    }).join('');
}

// 4. Gestion de la génération de pronostics avec déduction de jeton
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

// 5. Configuration des onglets et boutons
function setupEventListeners() {
    const btnGenerate = document.getElementById('btn-generate');
    const tabPronos = document.getElementById('tab-pronos');
    const tabDirect = document.getElementById('tab-direct');

    if (btnGenerate) {
        btnGenerate.addEventListener('click', handleGenerateAnalysis);
    }

    if (tabPronos) {
        tabPronos.addEventListener('click', () => loadTodayMatches());
    }

    if (tabDirect) {
        tabDirect.addEventListener('click', () => loadLiveMatches());
    }
}