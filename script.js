import { db, currentUser, consumeCredit } from "./firebase.js";

const API_URL = "https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=";

let currentLiveMatches = [];
let couponMatches = []; // Stockage du coupon combiné
let currentDateOffset = 0; // 0 = Aujourd'hui, -1 = Hier, 1 = Demain

// Liste des compétitions
const EXTENDED_LEAGUES = [
    { value: "ALL", name: "🌐 Toutes les compétitions" },
    { value: "Ligue 1", name: "⚽ Ligue 1 (France)" },
    { value: "Premier League", name: "🇬🇧 Premier League (Angleterre)" },
    { value: "La Liga", name: "🇪🇸 La Liga (Espagne)" },
    { value: "Serie A", name: "🇮🇹 Serie A (Italie)" },
    { value: "Bundesliga", name: "🇩🇪 Bundesliga (Allemagne)" },
    { value: "UEFA Champions League", name: "🏆 Champions League" },
    { value: "CAF Champions League", name: "🌍 Ligue des Champions CAF" },
    { value: "Saudi Pro League", name: "🇸🇦 Saudi Pro League" }
];

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    populateLeagueSelect();
    setupDateSelector();
    loadRealMatches();
    setupEventListeners();
    loadLocalHistory();
    syncCreditsUI();
}

// 1. Gestion des Dates (Hier / Aujourd'hui / Demain)
function getFormattedDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function setupDateSelector() {
    const matchesCard = document.querySelector('#section-pronos .card:nth-child(2)');
    if (!matchesCard || document.getElementById('date-selector-bar')) return;

    const dateBar = document.createElement('div');
    dateBar.id = 'date-selector-bar';
    dateBar.style.cssText = "display:flex; justify-content:space-between; margin-bottom:12px; gap:5px;";
    dateBar.innerHTML = `
        <button id="btn-yesterday" style="flex:1; padding:6px; background:#0f172a; border:1px solid #334155; color:#94a3b8; border-radius:6px; font-size:0.75rem; cursor:pointer;">◀ Hier</button>
        <button id="btn-today" style="flex:1; padding:6px; background:#2563eb; border:1px solid #2563eb; color:white; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">Aujourd'hui</button>
        <button id="btn-tomorrow" style="flex:1; padding:6px; background:#0f172a; border:1px solid #334155; color:#94a3b8; border-radius:6px; font-size:0.75rem; cursor:pointer;">Demain ▶</button>
    `;

    matchesCard.querySelector('h3').after(dateBar);

    document.getElementById('btn-yesterday').onclick = () => changeDate(-1);
    document.getElementById('btn-today').onclick = () => changeDate(0);
    document.getElementById('btn-tomorrow').onclick = () => changeDate(1);
}

function changeDate(offset) {
    currentDateOffset = offset;
    
    ['yesterday', 'today', 'tomorrow'].forEach((day, index) => {
        const btn = document.getElementById(`btn-${day}`);
        if (btn) {
            const isActive = (index - 1) === offset;
            btn.style.background = isActive ? '#2563eb' : '#0f172a';
            btn.style.color = isActive ? 'white' : '#94a3b8';
            btn.style.fontWeight = isActive ? 'bold' : 'normal';
        }
    });

    loadRealMatches();
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

// 2. Navigation
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

// 3. Charger les matchs par date
async function loadRealMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">⏳ Chargement...</div>`;

    const targetDate = getFormattedDate(currentDateOffset);

    try {
        const response = await fetch(`${API_URL}${targetDate}&s=Soccer`);
        const data = await response.json();
        const matches = data.events || [];
        renderMatches(matches, container);
    } catch (error) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match trouvé pour cette date.</div>`;
    }
}

// 4. Charger les matchs en Direct
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

    const today = getFormattedDate(0);

    try {
        const response = await fetch(`${API_URL}${today}&s=Soccer`);
        const data = await response.json();
        currentLiveMatches = data.events || [];
        filterLiveMatches(filterElem ? filterElem.value : 'ALL');
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
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: #94a3b8;">Aucun match disponible.</div>`;
        return;
    }

    container.innerHTML = matches.slice(0, 15).map(match => `
        <div style="background: #0f172a; margin: 8px 0; padding: 10px; border-radius: 6px; border: 1px solid #1e293b; display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1; cursor:pointer;" onclick="selectMatch('${match.strHomeTeam.replace(/'/g, "\\'")}', '${match.strAwayTeam.replace(/'/g, "\\'")}')">
                <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 2px;">${match.strLeague || "Football"}</div>
                <div style="font-size: 0.85rem; font-weight: 600; color:#f8fafc;">
                    ${match.strHomeTeam} <span style="color: #38bdf8;">VS</span> ${match.strAwayTeam}
                </div>
            </div>
            <button onclick="addToCoupon('${match.strHomeTeam.replace(/'/g, "\\'")}', '${match.strAwayTeam.replace(/'/g, "\\'")}')" 
                    style="background:#334155; color:#38bdf8; border:1px solid #38bdf8; padding:5px 8px; border-radius:6px; font-size:0.7rem; font-weight:bold; cursor:pointer; margin-left:8px;">
                + Coupon
            </button>
        </div>
    `).join('');
}

window.selectMatch = function(home, away) {
    window.switchTab('pronos');
    document.getElementById('home-team').value = home;
    document.getElementById('away-team').value = away;
};

// 5. Générateur de Pronostic IA Simple
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
    const confidence = Math.floor(Math.random() * 12) + 82;
    const goalsPredict = (Math.random() * 1.4 + 1.8).toFixed(1);
    const advice = winHome > 50 ? 'Victoire ' + home : 'Plus de 1.5 Buts';

    const analysisData = {
        home, away, winHome, winAway, draw, confidence, goalsPredict, advice,
        date: new Date().toLocaleDateString('fr-FR')
    };

    saveToLocalHistory(analysisData);
    displayAIResult(analysisData);
}

function displayAIResult(data) {
    const existing = document.getElementById('ai-result-card');
    if (existing) existing.remove();

    const shareText = encodeURIComponent(`⚽ *Pronostic SmartPronoIA*\n${data.home} vs ${data.away}\n🎯 Conseil: ${data.advice}\n🔥 Confiance: ${data.confidence}%\n\nGénéré via SmartPronoIA`);

    const card = document.createElement('div');
    card.id = 'ai-result-card';
    card.style.cssText = "background: #1e293b; border: 2px solid #38bdf8; border-radius: 12px; padding: 15px; margin-top: 15px;";

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="margin:0; color:#38bdf8; font-size:1rem;">🧠 Analyse SmartPronoIA</h4>
            <span style="background:rgba(34, 197, 94, 0.2); color:#22c55e; border: 1px solid #22c55e; padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold;">
                Confiance : ${data.confidence}%
            </span>
        </div>

        <div style="text-align:center; padding: 10px; background:#0f172a; border-radius:8px; margin-bottom:12px; border:1px solid #334155;">
            <div style="font-size:0.95rem; font-weight:bold; color:#f8fafc;">
                ${data.home} <span style="color:#38bdf8;">VS</span> ${data.away}
            </div>
        </div>

        <div style="background:#0f172a; padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid #334155;">
            <div style="font-size:0.75rem; font-weight:bold; color:#94a3b8; margin-bottom:8px;">📊 PROBABILITÉS DU MATCH</div>
            <div style="display:flex; height:10px; border-radius:5px; overflow:hidden; background:#334155; margin-bottom:10px;">
                <div style="width:${data.winHome}%; background:#38bdf8;"></div>
                <div style="width:${data.draw}%; background:#eab308;"></div>
                <div style="width:${data.winAway}%; background:#ef4444;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                <div style="color:#38bdf8;">🔵 ${data.home} : <strong>${data.winHome}%</strong></div>
                <div style="color:#eab308;">🟡 Nul : <strong>${data.draw}%</strong></div>
                <div style="color:#ef4444;">🔴 ${data.away} : <strong>${data.winAway}%</strong></div>
            </div>
        </div>

        <div style="background:#0f172a; padding:12px; border-radius:8px; border-left: 4px solid #22c55e; margin-bottom:12px;">
            <div style="font-size:0.75rem; color:#94a3b8; font-weight:bold;">🎯 CONSEIL SÉLECTIONNÉ</div>
            <div style="color:#22c55e; font-size:1rem; font-weight:bold; margin-top:4px;">${data.advice}</div>
            <div style="color:#cbd5e1; font-size:0.75rem; margin-top:4px;">Moyenne buts : <strong style="color:#38bdf8;">${data.goalsPredict}</strong></div>
        </div>

        <!-- Bouton Partager WhatsApp -->
        <a href="https://api.whatsapp.com/send?text=${shareText}" target="_blank" 
           style="display:block; text-align:center; background:#22c55e; color:#000; font-weight:bold; padding:10px; border-radius:8px; text-decoration:none; font-size:0.85rem;">
            📲 Partager le Pronostic sur WhatsApp
        </a>
    `;

    document.querySelector('#section-pronos .card').after(card);
    card.scrollIntoView({ behavior: 'smooth' });
}

// 6. Gestion du Coupon Combiné Multi-Matchs
window.addToCoupon = function(home, away) {
    if (couponMatches.length >= 4) {
        alert("Maximum 4 matchs par coupon combiné.");
        return;
    }

    if (couponMatches.some(m => m.home === home && m.away === away)) {
        alert("Ce match est déjà dans votre coupon.");
        return;
    }

    const odds = (Math.random() * 0.4 + 1.35).toFixed(2);
    const adviceOptions = [`Victoire ${home}`, 'Plus de 1.5 Buts', 'Les deux équipes marquant'];
    const advice = adviceOptions[Math.floor(Math.random() * adviceOptions.length)];

    couponMatches.push({ home, away, odds, advice });
    renderCouponCard();
};

window.removeFromCoupon = function(index) {
    couponMatches.splice(index, 1);
    renderCouponCard();
};

function renderCouponCard() {
    let couponCard = document.getElementById('combiner-coupon-card');

    if (couponMatches.length === 0) {
        if (couponCard) couponCard.remove();
        return;
    }

    if (!couponCard) {
        couponCard = document.createElement('div');
        couponCard.id = 'combiner-coupon-card';
        couponCard.style.cssText = "background: #1e293b; border: 2px solid #eab308; border-radius: 12px; padding: 15px; margin-top: 15px;";
        document.querySelector('#section-pronos .card').before(couponCard);
    }

    let totalOdds = couponMatches.reduce((acc, m) => acc * parseFloat(m.odds), 1).toFixed(2);
    let riskLevel = couponMatches.length > 2 ? "Élevé ⚠️" : "Modéré ⚖️";

    couponCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0; color:#eab308;">🎟️ Coupon Combiné (${couponMatches.length}/4)</h4>
            <span style="font-size:0.8rem; color:#cbd5e1;">Cote Totale : <strong style="color:#22c55e; font-size:1rem;">${totalOdds}</strong></span>
        </div>

        ${couponMatches.map((m, i) => `
            <div style="background:#0f172a; padding:8px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
                <div>
                    <div><strong>${m.home} VS ${m.away}</strong></div>
                    <div style="color:#22c55e;">💡 ${m.advice} (Cote : ${m.odds})</div>
                </div>
                <button onclick="removeFromCoupon(${i})" style="background:#ef4444; color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;">❌</button>
            </div>
        `).join('')}

        <div style="font-size:0.75rem; color:#94a3b8; margin-top:8px; text-align:right;">
            Risque global estimé : <strong>${riskLevel}</strong>
        </div>
    `;
}

// 7. Rechargement de Jetons & Historique Local
window.handleRechargeTokens = function() {
    const btn = document.querySelector('.btn-recharge');
    if (!btn) return;

    btn.disabled = true;
    let secondsLeft = 5;

    const interval = setInterval(() => {
        btn.innerText = `⏳ Visionnage (${secondsLeft}s)...`;
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