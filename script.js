import { db, currentUser, consumeCredit } from "./firebase.js";

// API TheSportsDB (Totalement gratuite, publique et sans blocage CORS)
const API_URL = "https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=";

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadRealMatches();
    setupEventListeners();
}

// Obtenir la date du jour (YYYY-MM-DD)
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 1. Charger les matchs du jour
async function loadRealMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">⏳ Chargement des matchs réels...</div>`;

    const today = getTodayDate();

    try {
        const response = await fetch(`${API_URL}${today}&s=Soccer`);
        if (!response.ok) throw new Error("Erreur serveur API");

        const data = await response.json();
        const matches = data.events || [];

        renderMatches(matches, container);
    } catch (error) {
        console.error("Erreur chargement matchs :", error);
        // Fallback visuel propre en cas de journée sans match
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match disponible pour aujourd'hui.</div>`;
    }
}

// 2. Afficher la liste des matchs
function renderMatches(matches, container) {
    if (!matches || matches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match au programme aujourd'hui.</div>`;
        return;
    }

    // Prendre jusqu'à 10 matchs
    const topMatches = matches.slice(0, 10);

    container.innerHTML = topMatches.map(match => {
        const homeTeam = match.strHomeTeam;
        const awayTeam = match.strAwayTeam;
        const league = match.strLeague || "Football";
        const time = match.strTime ? match.strTime.substring(0, 5) : "Aujourd'hui";

        return `
            <div style="background: #0f172a; margin: 8px 0; padding: 10px; border-radius: 6px; border: 1px solid #1e293b;">
                <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">${league}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 600; color: #f8fafc;">
                    <span>${homeTeam}</span>
                    <span style="color: #38bdf8; font-size: 0.75rem;">VS</span>
                    <span>${awayTeam}</span>
                </div>
                <div style="margin-top: 6px; font-size: 0.7rem; text-align: right; color: #22c55e;">
                    🕒 ${time}
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

    alert("Analyse générée avec succès ! (-1 Jeton)");
}

// 4. Écouteurs d'événements
function setupEventListeners() {
    const btnGenerate = document.getElementById('btn-generate');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', handleGenerateAnalysis);
    }

    const tabPronos = document.getElementById('tab-pronos');
    const tabDirect = document.getElementById('tab-direct');

    if (tabPronos) tabPronos.addEventListener('click', () => loadRealMatches());
    if (tabDirect) tabDirect.addEventListener('click', () => loadRealMatches());
}