import { db, currentUser, consumeCredit } from "./firebase.js";

// Clé API-Football / Sportsmonks (Remplace si tu as ta propre clé)
const API_KEY = "3e7eafe1ea6045bc97395ef3cdbebf1f"; 
const API_URL = "https://v3.football.api-sports.io";

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadTodayMatches();
    setupEventListeners();
}

// Obtenir la date du jour au format YYYY-MM-DD
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 1. Charger UNIQUEMENT les matchs du jour
async function loadTodayMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div class="loading">Chargement des matchs du jour...</div>`;

    const today = getTodayDate();

    try {
        const response = await fetch(`${API_URL}/fixtures?date=${today}`, {
            method: "GET",
            headers: {
                "x-apisports-key": API_KEY
            }
        });

        const data = await response.json();
        const matches = data.response || [];

        renderMatches(matches, container, "Aucun match prévu aujourd'hui.");
    } catch (error) {
        console.error("Erreur chargement matchs du jour:", error);
        container.innerHTML = `<div class="error">Impossible de charger les matchs du jour.</div>`;
    }
}

// 2. Charger UNIQUEMENT les matchs actuellement en direct
async function loadLiveMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div class="loading">Recherche des matchs en direct...</div>`;

    try {
        const response = await fetch(`${API_URL}/fixtures?live=all`, {
            method: "GET",
            headers: {
                "x-apisports-key": API_KEY
            }
        });

        const data = await response.json();
        const liveMatches = data.response || [];

        renderMatches(liveMatches, container, "Aucun match actuellement en direct.");
    } catch (error) {
        console.error("Erreur chargement matchs en direct:", error);
        container.innerHTML = `<div class="error">Impossible de charger les matchs en direct.</div>`;
    }
}

// 3. Affichage dynamique des cartes de matchs
function renderMatches(matches, container, emptyMessage) {
    if (matches.length === 0) {
        container.innerHTML = `<div class="empty">${emptyMessage}</div>`;
        return;
    }

    container.innerHTML = matches.map(item => {
        const fixture = item.fixture;
        const teams = item.teams;
        const status = fixture.status.short; // NS = Not Started, 1H/2H = Live, FT = Finished

        let statusBadge = `<span class="badge ${status === 'FT' ? 'ft' : 'live'}">${status}</span>`;

        return `
            <div class="match-card">
                <div class="league">${item.league.name} (${item.league.country})</div>
                <div class="teams">
                    <span class="team">${teams.home.name}</span>
                    <span class="vs">VS</span>
                    <span class="team">${teams.away.name}</span>
                </div>
                <div class="status-info">${statusBadge}</div>
            </div>
        `;
    }).join('');
}

// 4. Génération d'analyse IA avec déduction de 1 jeton
async function handleGenerateAnalysis() {
    if (!currentUser) {
        alert("Veuillez vous connecter avec votre compte Google pour générer une analyse.");
        return;
    }

    const hasCredit = await consumeCredit();
    if (!hasCredit) {
        alert("Vous n'avez pas assez de jetons. Vous devez recharger votre solde.");
        return;
    }

    // Logique de génération des pronostics
    alert("Analyse en cours de génération avec succès ! (-1 Jeton)");
}

// Écouteurs d'événements pour les onglets (Pronos, Direct, Générer)
function setupEventListeners() {
    const btnGenerate = document.getElementById('btn-generate');
    const tabPronos = document.getElementById('tab-pronos');
    const tabDirect = document.getElementById('tab-direct');

    if (btnGenerate) {
        btnGenerate.addEventListener('click', handleGenerateAnalysis);
    }

    if (tabPronos) {
        tabPronos.addEventListener('click', () => {
            loadTodayMatches();
        });
    }

    if (tabDirect) {
        tabDirect.addEventListener('click', () => {
            loadLiveMatches();
        });
    }
}
