import { db, currentUser, consumeCredit } from "./firebase.js";

const API_URL = "https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=";

let currentLiveMatches = [];

// Liste des compétitions
const EXTENDED_LEAGUES = [
    { value: "ALL", name: "🌐 Toutes les compétitions" },
    // Europe
    { value: "Ligue 1", name: "⚽ Ligue 1 (France)" },
    { value: "Ligue 2", name: "🇫🇷 Ligue 2 (France)" },
    { value: "Premier League", name: "🇬🇧 Premier League (Angleterre)" },
    { value: "Championship", name: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship (Angleterre)" },
    { value: "La Liga", name: "🇪🇸 La Liga (Espagne)" },
    { value: "Serie A", name: "🇮🇹 Serie A (Italie)" },
    { value: "Bundesliga", name: "🇩🇪 Bundesliga (Allemagne)" },
    { value: "Eredivisie", name: "🇳🇱 Eredivisie (Pays-Bas)" },
    { value: "Primeira Liga", name: "🇵🇹 Liga Portugal" },
    { value: "Pro League", name: "🇧🇪 Pro League (Belgique)" },
    { value: "Super Lig", name: "🇹🇷 Süper Lig (Turquie)" },
    // Coupes d'Europe
    { value: "UEFA Champions League", name: "🏆 Champions League" },
    { value: "UEFA Europa League", name: "🇪🇺 Europa League" },
    { value: "UEFA Conference League", name: "🇪🇺 Conference League" },
    // Afrique & Moyen-Orient
    { value: "CAF Champions League", name: "🌍 Ligue des Champions CAF" },
    { value: "Saudi Pro League", name: "🇸🇦 Saudi Pro League (Arabie Saoudite)" },
    { value: "Egyptian Premier League", name: "🇪🇬 Premier League (Égypte)" },
    { value: "Botola Pro", name: "🇲🇦 Botola Pro (Maroc)" },
    { value: "Ligue 1 Algeria", name: "🇩🇿 Ligue 1 (Algérie)" },
    // Amériques & Asie
    { value: "MLS", name: "🇺🇸 Major League Soccer (USA)" },
    { value: "Brasileirao", name: "🇧🇷 Série A (Brésil)" },
    { value: "Primera Division Argentina", name: "🇦🇷 Liga Argentina" },
    { value: "Liga MX", name: "🇲🇽 Liga MX (Mexique)" },
    { value: "J1 League", name: "🇯🇵 J1 League (Japon)" }
];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    populateLeagueSelect();
    loadRealMatches();
    setupEventListeners();
    loadLocalHistory();
    syncCreditsUI();
}

function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function populateLeagueSelect() {
    const leagueSelect = document.getElementById('league-select');
    if (!leagueSelect) return;

    leagueSelect.innerHTML = EXTENDED_LEAGUES
        .filter(l => l.value !== 'ALL')
        .map(l => `<option value="${l.value}">${l.name}</option>`)
        .join('');
}

function syncCreditsUI() {
    const savedCredits = localStorage.getItem('smartprono_credits');
    const credits = savedCredits !== null ? parseInt(savedCredits, 10) : 10;
    
    const creditHeader = document.getElementById('credits-count');
    const creditAccount = document.getElementById('account-credits');

    if (creditHeader) creditHeader.innerText = credits;
    if (creditAccount) creditAccount.innerText = credits;
}

function updateCredits(newTotal) {
    localStorage.setItem('smartprono_credits', newTotal);
    syncCreditsUI();
}

// 1. Navigation Onglets
window.switchTab = function(tabName) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));

    const targetSection = document.getElementById(`section-${tabName}`);
    const targetTab = document.getElementById(`tab-${tabName}`);

    if (targetSection) targetSection.classList.add('active');
    if (targetTab) targetTab.classList.add('active');

    if (tabName === 'direct') loadLiveMatches();
    if (tabName === 'compte') {
        loadLocalHistory();
        syncCreditsUI();
    }
};

// 2. Matchs Réels (Pronos)
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

// 3. Matchs en Direct + Filtres
async function loadLiveMatches() {
    const container = document.getElementById('live-matches-container');
    if (!container) return;

    let filterElem = document.getElementById('live-league-filter');
    if (!filterElem) {
        const filterCard = document.createElement('div');
        filterCard.style.cssText = "margin-bottom: 12px;";
        filterCard.innerHTML = `
            <label style="display:block; font-size:0.8rem; color:#94a3b8; margin-bottom:5px;">Filtrer par championnat :</label>
            <select id="live-league-filter" style="width:100%; padding:10px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:white; font-size:0.9rem;">
                ${EXTENDED_LEAGUES.map(l => `<option value="${l.value}">${l.name}</option>`).join('')}
            </select>
        `;
        container.before(filterCard);
        
        filterElem = document.getElementById('live-league-filter');
        filterElem.addEventListener('change', (e) => filterLiveMatches(e.target.value));
    }

    container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">⚡ Recherche...</div>`;

    const today = getTodayDate();

    try {
        const response = await fetch(`${API_URL}${today}&s=Soccer`);
        const data = await response.json();
        currentLiveMatches = data.events || [];
        
        const selectedLeague = filterElem ? filterElem.value : 'ALL';
        filterLiveMatches(selectedLeague);
    } catch (error) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match en direct disponible.</div>`;
    }
}

function filterLiveMatches(leagueQuery) {
    const container = document.getElementById('live-matches-container');
    if (!container) return;

    if (currentLiveMatches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match au programme.</div>`;
        return;
    }

    let filtered = currentLiveMatches;

    if (leagueQuery !== 'ALL') {
        filtered = currentLiveMatches.filter(m => m.strLeague && m.strLeague.toLowerCase().includes(leagueQuery.toLowerCase()));
    }

    renderMatches(filtered, container);
}

function renderMatches(matches, container) {
    if (!matches || matches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match pour cette sélection.</div>`;
        return;
    }

    container.innerHTML = matches.slice(0, 20).map(match => `
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

// 4. Moteur de Pronostics IA
function handleGenerateAnalysis() {
    const home = document.getElementById('home-team')?.value.trim();
    const away = document.getElementById('away-team')?.value.trim();

    if (!home || !away) {
        alert("Sélectionnez ou entrez deux équipes !");
        return;
    }

    const currentCredits = parseInt(document.getElementById('credits-count').innerText, 10);

    if (currentCredits <= 0) {
        alert("Plus de jetons ! Rechargez votre solde dans l'onglet Compte.");
        return;
    }

    updateCredits(currentCredits - 1);

    const winHome = Math.floor(Math.random() * 30) + 45;
    const winAway = Math.floor(Math.random() * 20) + 10;
    const draw = 100 - (winHome + winAway);
    const advice = winHome > 50 ? 'Victoire ' + home : 'Plus de 1.5 Buts';

    const analysisData = {
        home,
        away,
        winHome,
        winAway,
        draw,
        advice,
        date: new Date().toLocaleDateString('fr-FR')
    };

    saveToLocalHistory(analysisData);
    displayAIResult(analysisData);
}

function displayAIResult(data) {
    const existing = document.getElementById('ai-result-card');
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.id = 'ai-result-card';
    card.style.cssText = "background: #1e293b; border: 2px solid #38bdf8; border-radius: 12px; padding: 15px; margin-top: 15px;";

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 style="margin:0; color:#38bdf8;">🧠 Pronostic IA</h4>
            <span style="background:#22c55e; color:#000; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:bold;">Confiance : 85%</span>
        </div>
        <div style="font-size:0.9rem; font-weight:bold; text-align:center; margin: 10px 0;">
            ${data.home} <span style="color:#38bdf8;">VS</span> ${data.away}
        </div>
        <div style="background:#0f172a; padding:10px; border-radius:8px; font-size:0.8rem; margin-bottom:10px;">
            <div>Victoire ${data.home} : <strong>${data.winHome}%</strong> | Nul : <strong>${data.draw}%</strong> | Victoire ${data.away} : <strong>${data.winAway}%</strong></div>
        </div>
        <div style="background:#0f172a; padding:10px; border-radius:8px; font-size:0.8rem; color:#22c55e; font-weight:bold;">
            💡 Conseil : ${data.advice}
        </div>
    `;

    document.querySelector('#section-pronos .card').after(card);
    card.scrollIntoView({ behavior: 'smooth' });
}

// 5. Rechargement de Jetons
window.handleRechargeTokens = function() {
    const btn = document.querySelector('.btn-recharge');
    if (!btn) return;

    btn.disabled = true;
    let secondsLeft = 5;

    const interval = setInterval(() => {
        btn.innerText = `⏳ Visionnage en cours (${secondsLeft}s)...`;
        secondsLeft--;

        if (secondsLeft < 0) {
            clearInterval(interval);
            const currentCredits = parseInt(document.getElementById('credits-count').innerText, 10);
            updateCredits(currentCredits + 5);

            btn.innerText = `🎬 Obtenir +5 Jetons`;
            btn.disabled = false;
            alert("🎉 FÉLICITATIONS ! +5 Jetons ajoutés à votre solde.");
        }
    }, 1000);
};

// 6. Historique local
function saveToLocalHistory(item) {
    let history = JSON.parse(localStorage.getItem('smartprono_history')) || [];
    history.unshift(item);
    if (history.length > 10) history.pop();
    localStorage.setItem('smartprono_history', JSON.stringify(history));
}

function loadLocalHistory() {
    let historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;

    let history = JSON.parse(localStorage.getItem('smartprono_history')) || [];

    if (history.length === 0) {
        historyContainer.innerHTML = `<div style="text-align:center; padding: 10px; color: #94a3b8; font-size: 0.85rem;">Aucune analyse enregistrée.</div>`;
        return;
    }

    historyContainer.innerHTML = history.map(item => `
        <div style="background: #0f172a; border: 1px solid #334155; padding: 10px; border-radius: 8px; margin-bottom: 8px;">
            <div style="font-weight: bold; font-size: 0.85rem; color: #38bdf8;">${item.home} VS ${item.away}</div>
            <div style="font-size: 0.8rem; color: #22c55e; font-weight: 500; margin-top: 2px;">💡 ${item.advice}</div>
            <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">Généré le ${item.date}</div>
        </div>
    `).join('');
}

function setupEventListeners() {
    document.getElementById('btn-generate')?.addEventListener('click', handleGenerateAnalysis);
    
    const btnRecharge = document.querySelector('.btn-recharge');
    if (btnRecharge) {
        btnRecharge.onclick = window.handleRechargeTokens;
    }
}