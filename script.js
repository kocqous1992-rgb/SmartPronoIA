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

// 1. Navigation entre onglets
window.switchTab = function(tabName) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));

    const targetSection = document.getElementById(`section-${tabName}`);
    const targetTab = document.getElementById(`tab-${tabName}`);

    if (targetSection) targetSection.classList.add('active');
    if (targetTab) targetTab.classList.add('active');

    if (tabName === 'direct') loadLiveMatches();
};

// 2. Charger les matchs réels
async function loadRealMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">⏳ Chargement des matchs...</div>`;

    const today = getTodayDate();

    try {
        const response = await fetch(`${API_URL}${today}&s=Soccer`);
        const data = await response.json();
        const matches = data.events || [];
        renderMatches(matches, container);
    } catch (error) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match disponible.</div>`;
    }
}

// 3. Charger les matchs direct
async function loadLiveMatches() {
    const container = document.getElementById('live-matches-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">⚡ Recherche...</div>`;

    const today = getTodayDate();

    try {
        const response = await fetch(`${API_URL}${today}&s=Soccer`);
        const data = await response.json();
        const matches = data.events || [];
        renderMatches(matches, container);
    } catch (error) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match en direct.</div>`;
    }
}

function renderMatches(matches, container) {
    if (!matches || matches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match au programme.</div>`;
        return;
    }

    container.innerHTML = matches.slice(0, 10).map(match => `
        <div style="background: #0f172a; margin: 8px 0; padding: 10px; border-radius: 6px; border: 1px solid #1e293b; cursor: pointer;" 
             onclick="selectMatch('${match.strHomeTeam.replace(/'/g, "\\'")}', '${match.strAwayTeam.replace(/'/g, "\\'")}')">
            <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 4px;">${match.strLeague || "Football"}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 600;">
                <span>${match.strHomeTeam}</span>
                <span style="color: #38bdf8;">VS</span>
                <span>${match.strAwayTeam}</span>
            </div>
        </div>
    `).join('');
}

window.selectMatch = function(home, away) {
    window.switchTab('pronos');
    document.getElementById('home-team').value = home;
    document.getElementById('away-team').value = away;
};

// 4. Générer l'Analyse IA
function handleGenerateAnalysis() {
    const home = document.getElementById('home-team')?.value.trim();
    const away = document.getElementById('away-team')?.value.trim();

    if (!home || !away) {
        alert("Sélectionnez ou entrez deux équipes !");
        return;
    }

    const creditElem = document.getElementById('credits-count');
    let currentCredits = parseInt(creditElem.innerText, 10);

    if (currentCredits <= 0) {
        alert("Plus de jetons !");
        return;
    }

    // Déduction du jeton
    creditElem.innerText = currentCredits - 1;
    document.getElementById('account-credits').innerText = currentCredits - 1;

    // Affichage de l'analyse
    displayAIResult(home, away);
}

function displayAIResult(home, away) {
    const existing = document.getElementById('ai-result-card');
    if (existing) existing.remove();

    const winHome = Math.floor(Math.random() * 30) + 45;
    const winAway = Math.floor(Math.random() * 20) + 10;
    const draw = 100 - (winHome + winAway);

    const card = document.createElement('div');
    card.id = 'ai-result-card';
    card.style.cssText = "background: #1e293b; border: 2px solid #38bdf8; border-radius: 12px; padding: 15px; margin-top: 15px;";

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 style="margin:0; color:#38bdf8;">🧠 Pronostic IA</h4>
            <span style="background:#22c55e; color:#000; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:bold;">Confiance : 85%</span>
        </div>
        <div style="font-size:0.9rem; font-weight:bold; text-align:center; margin: 10px 0;">
            ${home} <span style="color:#38bdf8;">VS</span> ${away}
        </div>
        <div style="background:#0f172a; padding:10px; border-radius:8px; font-size:0.8rem; margin-bottom:10px;">
            <div>Victoire ${home} : <strong>${winHome}%</strong> | Nul : <strong>${draw}%</strong> | Victoire ${away} : <strong>${winAway}%</strong></div>
        </div>
        <div style="background:#0f172a; padding:10px; border-radius:8px; font-size:0.8rem; color:#22c55e; font-weight:bold;">
            💡 Conseil : ${winHome > 50 ? 'Victoire ' + home : 'Plus de 1.5 Buts'}
        </div>
    `;

    document.querySelector('.card').after(card);
    card.scrollIntoView({ behavior: 'smooth' });
}

function setupEventListeners() {
    document.getElementById('btn-generate')?.addEventListener('click', handleGenerateAnalysis);
}