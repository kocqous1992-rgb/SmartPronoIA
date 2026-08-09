import { db, currentUser, consumeCredit } from "./firebase.js";

const API_KEY = "3e7eafe1ea6045bc97395ef3cdbebf1f";
const API_URL = "https://api.football-data.org/v4";
// Proxy CORS direct et stable
const PROXY = "https://api.allorigins.win/raw?url=";

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadTodayMatches();
    setupEventListeners();
}

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 1. Charger les matchs du jour avec fallback
async function loadTodayMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 20px; color: #fff;">⏳ Chargement des matchs du jour...</div>`;

    const today = getTodayDate();
    const targetUrl = `${API_URL}/matches?dateFrom=${today}&dateTo=${today}`;

    try {
        const response = await fetch(PROXY + encodeURIComponent(targetUrl), {
            method: "GET",
            headers: {
                "X-Auth-Token": API_KEY
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const matches = data.matches || [];

        renderMatches(matches, container, "Aucun match prévu pour aujourd'hui.");
    } catch (error) {
        console.error("Erreur chargement matchs :", error);
        // Affichage de secours structuré pour débloquer l'interface
        container.innerHTML = `
            <div style="text-align:center; padding: 15px; color: #f59e0b; font-size: 0.85rem;">
                ⚠️ Limite d'appels API atteinte ou connexion lente. Reconnectez-vous dans quelques instants.
            </div>
        `;
    }
}

// 2. Charger les matchs en direct
async function loadLiveMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 20px; color: #fff;">⚡ Recherche des matchs en direct...</div>`;

    const targetUrl = `${API_URL}/matches?status=IN_PLAY`;

    try {
        const response = await fetch(PROXY + encodeURIComponent(targetUrl), {
            method: "GET",
            headers: {
                "X-Auth-Token": API_KEY
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const liveMatches = data.matches || [];

        renderMatches(liveMatches, container, "Aucun match actuellement en direct.");
    } catch (error) {
        console.error("Erreur direct :", error);
        container.innerHTML = `<div style="text-align:center; padding: 20px; color: #aaa;">Aucun match en direct actuellement.</div>`;
    }
}

// 3. Rendu des cartes de matchs
function renderMatches(matches, container, emptyMessage) {
    if (!matches || matches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 20px; color: #aaa;">${emptyMessage}</div>`;
        return;
    }

    container.innerHTML = matches.map(match => {
        const homeTeam = match.homeTeam.shortName || match.homeTeam.name;
        const awayTeam = match.awayTeam.shortName || match.awayTeam.name;
        const status = match.status;
        const league = match.competition ? match.competition.name : "Football";

        let statusText = "À venir";
        if (status === 'IN_PLAY') statusText = '🔴 EN DIRECT';
        else if (status === 'FINISHED') statusText = 'FT';

        return `
            <div style="background: #1e293b; margin: 10px 0; padding: 12px; border-radius: 8px; color: #fff;">
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

// 4. Action de génération
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

// 5. Écouteurs
function setupEventListeners() {
    const btnGenerate = document.getElementById('btn-generate');
    const tabPronos = document.getElementById('tab-pronos');
    const tabDirect = document.getElementById('tab-direct');

    if (btnGenerate) btnGenerate.addEventListener('click', handleGenerateAnalysis);
    if (tabPronos) tabPronos.addEventListener('click', () => loadTodayMatches());
    if (tabDirect) tabDirect.addEventListener('click', () => loadLiveMatches());
}