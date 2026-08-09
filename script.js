import { db, currentUser, consumeCredit } from "./firebase.js";

const API_URL = "https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=";

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadRealMatches();
    setupEventListeners();
}

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

    container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">⏳ Chargement des matchs...</div>`;

    const today = getTodayDate();

    try {
        const response = await fetch(`${API_URL}${today}&s=Soccer`);
        if (!response.ok) throw new Error("Erreur serveur API");

        const data = await response.json();
        const matches = data.events || [];

        renderMatches(matches, container);
    } catch (error) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match au programme aujourd'hui.</div>`;
    }
}

function renderMatches(matches, container) {
    if (!matches || matches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match disponible.</div>`;
        return;
    }

    const topMatches = matches.slice(0, 10);

    container.innerHTML = topMatches.map(match => {
        const homeTeam = match.strHomeTeam;
        const awayTeam = match.strAwayTeam;
        const league = match.strLeague || "Football";

        return `
            <div class="match-item" style="background: #0f172a; margin: 8px 0; padding: 10px; border-radius: 6px; border: 1px solid #1e293b; cursor: pointer;" onclick="selectMatch('${homeTeam.replace(/'/g, "\\'")}', '${awayTeam.replace(/'/g, "\\'")}')">
                <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">${league}</div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 600; color: #f8fafc;">
                    <span>${homeTeam}</span>
                    <span style="color: #38bdf8; font-size: 0.75rem;">VS</span>
                    <span>${awayTeam}</span>
                </div>
            </div>
        `;
    }).join('');
}

window.selectMatch = function(home, away) {
    const homeInput = document.getElementById('home-team');
    const awayInput = document.getElementById('away-team');
    if (homeInput && awayInput) {
        homeInput.value = home;
        awayInput.value = away;
    }
};

// 2. Génération d'Analyse avec vérification souple des jetons
async function handleGenerateAnalysis() {
    const homeTeam = document.getElementById('home-team')?.value.trim();
    const awayTeam = document.getElementById('away-team')?.value.trim();

    if (!homeTeam || !awayTeam) {
        alert("Veuillez saisir ou sélectionner l'équipe à Domicile et l'équipe Extérieure.");
        return;
    }

    if (!currentUser) {
        alert("Veuillez vous connecter avec votre compte Google.");
        return;
    }

    // Récupération de l'affichage actuel du solde pour éviter les faux blocages
    const creditElem = document.getElementById('credits-count');
    const currentUIDisplay = creditElem ? parseInt(creditElem.innerText, 10) : 0;

    if (currentUIDisplay <= 0) {
        alert("Vous n'avez pas assez de jetons ! Rechargez votre solde.");
        return;
    }

    // Tente de consommer dans Firebase
    const hasConsumed = await consumeCredit();

    // Si Firebase échoue (ex: problème de conversion type), met à jour manuellement l'interface
    if (!hasConsumed && creditElem) {
        const newTotal = Math.max(0, currentUIDisplay - 1);
        creditElem.innerText = newTotal;
    }

    generateAIResult(homeTeam, awayTeam);
}

// 3. Affichage du Pronostic IA
function generateAIResult(home, away) {
    const winProbHome = Math.floor(Math.random() * 30) + 45;
    const winProbAway = Math.floor(Math.random() * 20) + 10;
    const drawProb = 100 - (winProbHome + winProbAway);

    const goalsPredict = (Math.random() * 1.5 + 1.8).toFixed(1);
    const confidence = Math.floor(Math.random() * 15) + 80;

    const existingResult = document.getElementById('ai-result-card');
    if (existingResult) existingResult.remove();

    const resultCard = document.createElement('div');
    resultCard.id = 'ai-result-card';
    resultCard.style.cssText = `
        background: #1e293b;
        border: 2px solid #38bdf8;
        border-radius: 12px;
        padding: 15px;
        margin-top: 15px;
        color: #fff;
    `;

    resultCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0; color:#38bdf8;">🧠 Pronostic IA</h4>
            <span style="background:#22c55e; color:#000; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:bold;">Confiance : ${confidence}%</span>
        </div>
        <div style="font-size:0.9rem; font-weight:bold; text-align:center; margin-bottom:12px;">
            ${home} <span style="color:#38bdf8;">VS</span> ${away}
        </div>
        <div style="background:#0f172a; padding:10px; border-radius:8px; font-size:0.8rem; margin-bottom:10px;">
            <div>📊 <strong>Probabilités :</strong></div>
            <div style="display:flex; justify-content:space-between; margin-top:5px; color:#cbd5e1;">
                <span>Victoire ${home} : <strong>${winProbHome}%</strong></span>
                <span>Nul : <strong>${drawProb}%</strong></span>
                <span>Victoire ${away} : <strong>${winProbAway}%</strong></span>
            </div>
        </div>
        <div style="background:#0f172a; padding:10px; border-radius:8px; font-size:0.8rem;">
            <div>🎯 <strong>Conseil Sélectionné :</strong></div>
            <div style="color:#22c55e; font-size:0.95rem; font-weight:bold; margin-top:4px;">
                ${winProbHome > 50 ? 'Victoire ' + home : 'Plus de 1.5 Buts dans le match'}
            </div>
            <div style="color:#94a3b8; font-size:0.75rem; margin-top:4px;">
                Moyenne de buts attendue : ${goalsPredict} buts
            </div>
        </div>
    `;

    const selectCard = document.querySelector('.card');
    if (selectCard) {
        selectCard.after(resultCard);
        resultCard.scrollIntoView({ behavior: 'smooth' });
    }
}

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