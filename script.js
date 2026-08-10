import { db, currentUser, consumeCredit } from "./firebase.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const API_URL = "https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=";

let currentLiveMatches = [];
let couponMatches = [];
let currentDateOffset = 0;

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
    initTheme();
    populateLeagueSelect();
    setupDateSelector();
    loadRealMatches();
    setupEventListeners();
    loadLocalHistory();
    syncCreditsUI();
}

// 1. Gestion du Thème Sombre / Clair
window.toggleTheme = function() {
    const isLight = document.body.classList.toggle('light-theme');
    const btnTheme = document.getElementById('btn-theme');
    if (btnTheme) btnTheme.innerText = isLight ? '☀️' : '🌙';
    localStorage.setItem('smartprono_theme', isLight ? 'light' : 'dark');
};

function initTheme() {
    const savedTheme = localStorage.getItem('smartprono_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const btnTheme = document.getElementById('btn-theme');
        if (btnTheme) btnTheme.innerText = '☀️';
    }
}

// 2. Dates et PWA
function getFormattedDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function setupDateSelector() {
    const matchesCard = document.querySelectorAll('#section-pronos .card')[2];
    if (!matchesCard || document.getElementById('date-selector-bar')) return;

    const dateBar = document.createElement('div');
    dateBar.id = 'date-selector-bar';
    dateBar.style.cssText = "display:flex; justify-content:space-between; margin-bottom:12px; gap:5px;";
    dateBar.innerHTML = `
        <button id="btn-yesterday" style="flex:1; padding:6px; background:var(--inner-bg); border:1px solid var(--border-color); color:var(--text-muted); border-radius:6px; font-size:0.75rem; cursor:pointer;">◀ Hier</button>
        <button id="btn-today" style="flex:1; padding:6px; background:#2563eb; border:1px solid #2563eb; color:white; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">Aujourd'hui</button>
        <button id="btn-tomorrow" style="flex:1; padding:6px; background:var(--inner-bg); border:1px solid var(--border-color); color:var(--text-muted); border-radius:6px; font-size:0.75rem; cursor:pointer;">Demain ▶</button>
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
            btn.style.background = isActive ? '#2563eb' : 'var(--inner-bg)';
            btn.style.color = isActive ? 'white' : 'var(--text-muted)';
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

// 3. Synchronisation Cloud Firestore + Local
async function syncCreditsUI() {
    let credits = 10;

    if (currentUser) {
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && userDoc.data().credits !== undefined) {
                credits = parseInt(userDoc.data().credits, 10);
            } else {
                await setDoc(userDocRef, { credits: 10, email: currentUser.email }, { merge: true });
            }
        } catch (e) {
            console.error("Erreur sync Cloud :", e);
        }
    } else {
        const savedCredits = localStorage.getItem('smartprono_credits');
        credits = savedCredits !== null ? parseInt(savedCredits, 10) : 10;
    }
    
    const creditHeader = document.getElementById('credits-count');
    const creditAccount = document.getElementById('account-credits');

    if (creditHeader) creditHeader.innerText = credits;
    if (creditAccount) creditAccount.innerText = credits;
}

async function updateCredits(newTotal) {
    localStorage.setItem('smartprono_credits', newTotal);
    
    if (currentUser) {
        try {
            const userDocRef = doc(db, "users", currentUser.uid);
            await setDoc(userDocRef, { credits: newTotal }, { merge: true });
        } catch (e) {
            console.error("Erreur mise à jour Cloud :", e);
        }
    }

    syncCreditsUI();
}

// 4. Navigation
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

// 5. Charger matchs et bloc Pronos VIP
async function loadRealMatches() {
    const container = document.getElementById('matches-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding: 15px; color: var(--text-muted);">⏳ Chargement...</div>`;

    const targetDate = getFormattedDate(currentDateOffset);

    try {
        const response = await fetch(`${API_URL}${targetDate}&s=Soccer`);
        const data = await response.json();
        const matches = data.events || [];
        renderMatches(matches, container);
        renderVIPMatches(matches);
    } catch (error) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: var(--text-muted);">Aucun match trouvé.</div>`;
    }
}

function renderVIPMatches(matches) {
    const vipContainer = document.getElementById('vip-matches-container');
    if (!vipContainer) return;

    if (!matches || matches.length === 0) {
        vipContainer.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); text-align:center;">Aucun prono VIP disponible.</div>`;
        return;
    }

    const vipList = matches.slice(0, 2);
    vipContainer.innerHTML = vipList.map(m => `
        <div style="background:var(--inner-bg); border:1px solid var(--border-color); padding:8px 10px; border-radius:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <div style="font-size:0.85rem; font-weight:bold; color:var(--text-color);">${m.strHomeTeam} VS ${m.strAwayTeam}</div>
                <div style="font-size:0.75rem; color:#22c55e; font-weight:bold;">💡 Conseil : Victoire ${m.strHomeTeam}</div>
            </div>
            <button onclick="selectMatch('${m.strHomeTeam.replace(/'/g, "\\'")}', '${m.strAwayTeam.replace(/'/g, "\\'")}')" 
                    style="background:#eab308; color:#000; font-weight:bold; border:none; border-radius:4px; padding:4px 8px; font-size:0.7rem; cursor:pointer;">
                Analyser
            </button>
        </div>
    `).join('');
}

// 6. Matchs Direct
async function loadLiveMatches() {
    const container = document.getElementById('live-matches-container');
    if (!container) return;

    let filterElem = document.getElementById('live-league-filter');
    if (!filterElem) {
        const filterCard = document.createElement('div');
        filterCard.style.cssText = "margin-bottom: 12px;";
        filterCard.innerHTML = `
            <label style="display:block; font-size:0.8rem; color:var(--text-muted); margin-bottom:5px;">Filtrer par championnat :</label>
            <select id="live-league-filter" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border-color); background:var(--inner-bg); color:var(--text-color); font-size:0.9rem;">
                ${EXTENDED_LEAGUES.map(l => `<option value="${l.value}">${l.name}</option>`).join('')}
            </select>
        `;
        container.before(filterCard);
        
        filterElem = document.getElementById('live-league-filter');
        filterElem.addEventListener('change', (e) => filterLiveMatches(e.target.value));
    }

    container.innerHTML = `<div style="text-align:center; padding: 15px; color: var(--text-muted);">⚡ Recherche...</div>`;

    const today = getFormattedDate(0);

    try {
        const response = await fetch(`${API_URL}${today}&s=Soccer`);
        const data = await response.json();
        currentLiveMatches = data.events || [];
        filterLiveMatches(filterElem ? filterElem.value : 'ALL');
    } catch (error) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: var(--text-muted);">Aucun match en direct.</div>`;
    }
}

function filterLiveMatches(leagueQuery) {
    const container = document.getElementById('live-matches-container');
    if (!container) return;

    if (currentLiveMatches.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: var(--text-muted);">Aucun match au programme.</div>`;
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
        container.innerHTML = `<div style="text-align:center; padding: 15px; color: var(--text-muted);">Aucun match disponible.</div>`;
        return;
    }

    container.innerHTML = matches.slice(0, 15).map(match => `
        <div style="background: var(--inner-bg); margin: 8px 0; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1; cursor:pointer;" onclick="selectMatch('${match.strHomeTeam.replace(/'/g, "\\'")}', '${match.strAwayTeam.replace(/'/g, "\\'")}')">
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2px;">${match.strLeague || "Football"}</div>
                <div style="font-size: 0.85rem; font-weight: 600; color:var(--text-color);">
                    ${match.strHomeTeam} <span style="color: var(--primary);">VS</span> ${match.strAwayTeam}
                </div>
            </div>
            <button onclick="addToCoupon('${match.strHomeTeam.replace(/'/g, "\\'")}', '${match.strAwayTeam.replace(/'/g, "\\'")}')" 
                    style="background:var(--border-color); color:var(--primary); border:1px solid var(--primary); padding:5px 8px; border-radius:6px; font-size:0.7rem; font-weight:bold; cursor:pointer; margin-left:8px;">
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

// 7. Pronostics IA + Rechargement + Historique
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
    card.style.cssText = "background: var(--card-bg); border: 2px solid #38bdf8; border-radius: 12px; padding: 15px; margin-top: 15px;";

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="margin:0; color:#38bdf8; font-size:1rem;">🧠 Analyse SmartPronoIA</h4>
            <span style="background:rgba(34, 197, 94, 0.2); color:#22c55e; border: 1px solid #22c55e; padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold;">
                Confiance : ${data.confidence}%
            </span>
        </div>

        <div style="text-align:center; padding: 10px; background:var(--inner-bg); border-radius:8px; margin-bottom:12px; border:1px solid var(--border-color);">
            <div style="font-size:0.95rem; font-weight:bold; color:var(--text-color);">
                ${data.home} <span style="color:#38bdf8;">VS</span> ${data.away}
            </div>
        </div>

        <div style="background:var(--inner-bg); padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid var(--border-color);">
            <div style="font-size:0.75rem; font-weight:bold; color:var(--text-muted); margin-bottom:8px;">📊 PROBABILITÉS DU MATCH</div>
            <div style="display:flex; height:10px; border-radius:5px; overflow:hidden; background:var(--border-color); margin-bottom:10px;">
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

        <div style="background:var(--inner-bg); padding:12px; border-radius:8px; border-left: 4px solid #22c55e; margin-bottom:12px;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:bold;">🎯 CONSEIL SÉLECTIONNÉ</div>
            <div style="color:#22c55e; font-size:1rem; font-weight:bold; margin-top:4px;">${data.advice}</div>
            <div style="color:var(--text-color); font-size:0.75rem; margin-top:4px;">Moyenne buts : <strong style="color:#38bdf8;">${data.goalsPredict}</strong></div>
        </div>

        <a href="https://api.whatsapp.com/send?text=${shareText}" target="_blank" 
           style="display:block; text-align:center; background:#22c55e; color:#000; font-weight:bold; padding:10px; border-radius:8px; text-decoration:none; font-size:0.85rem;">
            📲 Partager le Pronostic sur WhatsApp
        </a>
    `;

    document.querySelectorAll('#section-pronos .card')[1].after(card);
    card.scrollIntoView({ behavior: 'smooth' });
}

window.addToCoupon = function(home, away) {
    if (couponMatches.length >= 4) return alert("Maximum 4 matchs par coupon.");
    if (couponMatches.some(m => m.home === home && m.away === away)) return alert("Déjà dans le coupon.");

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
        couponCard.style.cssText = "background: var(--card-bg); border: 2px solid #eab308; border-radius: 12px; padding: 15px; margin-top: 15px;";
        document.querySelectorAll('#section-pronos .card')[1].before(couponCard);
    }

    let totalOdds = couponMatches.reduce((acc, m) => acc * parseFloat(m.odds), 1).toFixed(2);

    couponCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0; color:#eab308;">🎟️ Coupon Combiné (${couponMatches.length}/4)</h4>
            <span style="font-size:0.8rem; color:var(--text-color);">Cote : <strong style="color:#22c55e; font-size:1rem;">${totalOdds}</strong></span>
        </div>
        ${couponMatches.map((m, i) => `
            <div style="background:var(--inner-bg); padding:8px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
                <div>
                    <div><strong>${m.home} VS ${m.away}</strong></div>
                    <div style="color:#22c55e;">💡 ${m.advice} (${m.odds})</div>
                </div>
                <button onclick="removeFromCoupon(${i})" style="background:#ef4444; color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;">❌</button>
            </div>
        `).join('')}
    `;
}

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
            upda