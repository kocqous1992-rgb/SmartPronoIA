let realMatchesList = [];
let couponList = [];
let currentFilterLeague = "ALL";

const EXTENDED_LEAGUES = [
    { value: "ALL", name: "🌐 Toutes" },
    { value: "Ligue 1", name: "⚽ Ligue 1" },
    { value: "Premier League", name: "🇬🇧 Premier League" },
    { value: "La Liga", name: "🇪🇸 La Liga" },
    { value: "Serie A", name: "🇮🇹 Serie A" },
    { value: "Bundesliga", name: "🇩🇪 Bundesliga" },
    { value: "Champions League", name: "🏆 Champions League" }
];

document.addEventListener('DOMContentLoaded', () => {
    populateLeagueSelect();
    renderLeaguePills();
    syncCreditsUI();
    setupEventListeners();
    loadHistoryUI();

    if (localStorage.getItem('smartprono_theme') === 'light') {
        document.body.classList.add('light-mode');
    }

    loadTodayMatches();
});

function getTodayFormattedDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadTodayMatches() {
    const container = document.getElementById('matches-container');
    const vipContainer = document.getElementById('vip-matches-list');
    const liveContainer = document.getElementById('live-matches-container');

    if (container) {
        container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted);">⏳ Chargement des matchs réels depuis l'API...</div>`;
    }

    const dateStr = getTodayFormattedDate();
    // Utilisation d'un relais CORS fiable vers l'API des matchs
    const targetUrl = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?s=Soccer&d=${dateStr}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("HTTP " + response.status);

        const result = await response.json();
        const data = JSON.parse(result.contents);

        if (data && data.events && Array.isArray(data.events) && data.events.length > 0) {
            realMatchesList = data.events.map((e, idx) => ({
                id: e.idEvent || idx,
                home: e.strHomeTeam,
                away: e.strAwayTeam,
                leagueName: e.strLeague ? `⚽ ${e.strLeague}` : "⚽ Football",
                time: e.strTime ? e.strTime.substring(0, 5) : "",
                status: e.strStatus || ""
            }));

            renderMatchesList(realMatchesList);
            renderVIPMatches(realMatchesList);
            renderLiveMatchesList(realMatchesList);
        } else {
            realMatchesList = [];
            showEmptyState("Aucun match disponible pour cette date.");
        }
    } catch (err) {
        realMatchesList = [];
        showEmptyState("Aucun match disponible pour cette date.");
    }
}

function showEmptyState(msg) {
    const container = document.getElementById('matches-container');
    const vipContainer = document.getElementById('vip-matches-list');
    const liveContainer = document.getElementById('live-matches-container');

    const html = `
        <div style="text-align:center; padding:15px; color:var(--text-muted);">
            <div>${msg}</div>
            <button class="btn-retry" onclick="loadTodayMatches()" style="margin-top:10px;">🔄 Réessayer</button>
        </div>
    `;

    if (container) container.innerHTML = html;
    if (vipContainer) vipContainer.innerHTML = html;
    if (liveContainer) liveContainer.innerHTML = html;
}

function renderMatchesList(list) {
    const container = document.getElementById('matches-container');
    if (!container) return;

    if (!list || list.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted);">Aucun match disponible pour cette date.</div>`;
        return;
    }

    container.innerHTML = list.map(m => `
        <div style="background: var(--inner-bg); margin: 8px 0; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1; cursor:pointer;" onclick="selectMatch('${escapeQuotes(m.home)}', '${escapeQuotes(m.away)}')">
                <div style="font-size: 0.75rem; color: var(--text-muted);">${m.leagueName} ${m.time ? '• ' + m.time : ''}</div>
                <div style="font-size: 0.85rem; font-weight: 600;">${m.home} <span style="color: var(--primary);">VS</span> ${m.away}</div>
            </div>
            <div style="display:flex; gap:5px;">
                <button onclick="selectMatch('${escapeQuotes(m.home)}', '${escapeQuotes(m.away)}')" style="background:var(--card-bg); color:var(--primary); border:1px solid var(--primary); padding:5px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">Choisir</button>
                <button onclick="addToCoupon('${escapeQuotes(m.home)}', '${escapeQuotes(m.away)}')" style="background:#eab308; color:#000; border:none; padding:5px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">+ Ticket</button>
            </div>
        </div>
    `).join('');
}

function renderVIPMatches(list) {
    const vipContainer = document.getElementById('vip-matches-list');
    if (!vipContainer) return;

    if (!list || list.length === 0) {
        vipContainer.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted);">Aucun match disponible pour cette date.</div>`;
        return;
    }

    const vipSelection = list.slice(0, 3);

    vipContainer.innerHTML = vipSelection.map(m => `
        <div style="background: var(--inner-bg); padding: 10px; border-radius: 6px; margin-top: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${m.leagueName}</div>
                <div style="font-size: 0.85rem; font-weight: bold;">${m.home} VS ${m.away}</div>
            </div>
            <button onclick="selectMatch('${escapeQuotes(m.home)}', '${escapeQuotes(m.away)}')" style="background:#eab308; color:#000; font-weight:bold; border:none; border-radius:4px; padding:6px 10px; font-size:0.75rem; cursor:pointer;">Choisir</button>
        </div>
    `).join('');
}

function renderLiveMatchesList(list) {
    const liveContainer = document.getElementById('live-matches-container');
    if (!liveContainer) return;

    if (!list || list.length === 0) {
        liveContainer.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted);">Aucun match disponible pour cette date.</div>`;
        return;
    }

    const liveSelection = list.slice(0, 4);

    liveContainer.innerHTML = liveSelection.map(m => `
        <div style="background: var(--inner-bg); margin: 8px 0; padding: 12px; border-radius: 6px; border: 1px solid #ef4444;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">${m.leagueName}</span>
                <span style="background:#ef4444; color:white; font-size:0.65rem; font-weight:bold; padding:2px 6px; border-radius:10px;">🔴 Match Réel</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size: 0.85rem; font-weight: bold; flex:1;">
                    ${m.home} <span style="color:var(--primary);">VS</span> ${m.away}
                </div>
                <button onclick="selectMatch('${escapeQuotes(m.home)}', '${escapeQuotes(m.away)}')" style="background:var(--card-bg); color:var(--primary); border:1px solid var(--primary); padding:5px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">Analyser</button>
            </div>
        </div>
    `).join('');
}

function escapeQuotes(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

window.toggleTheme = function() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('smartprono_theme', isLight ? 'light' : 'dark');
};

function populateLeagueSelect() {
    const select = document.getElementById('league-select');
    if (!select) return;
    select.innerHTML = EXTENDED_LEAGUES.map(l => `<option value="${l.value}">${l.name}</option>`).join('');
}

function renderLeaguePills() {
    const container = document.getElementById('league-pills-container');
    if (!container) return;

    container.innerHTML = EXTENDED_LEAGUES.map(l => `
        <div class="pill ${l.value === currentFilterLeague ? 'active' : ''}" onclick="selectLeaguePill('${l.value}')">
            ${l.name}
        </div>
    `).join('');
}

window.selectLeaguePill = function(leagueValue) {
    currentFilterLeague = leagueValue;
    const select = document.getElementById('league-select');
    if (select) select.value = leagueValue;
    
    renderLeaguePills();
    filterMatches();
};

window.filterMatches = function() {
    const select = document.getElementById('league-select');
    const selectedLeague = select ? select.value : 'ALL';
    currentFilterLeague = selectedLeague;
    renderLeaguePills();

    const searchInput = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

    let filtered = realMatchesList;

    if (selectedLeague !== 'ALL') {
        filtered = filtered.filter(m => m.leagueName.toLowerCase().includes(selectedLeague.toLowerCase()));
    }

    if (searchInput !== '') {
        filtered = filtered.filter(m => 
            m.home.toLowerCase().includes(searchInput) || 
            m.away.toLowerCase().includes(searchInput)
        );
    }

    renderMatchesList(filtered);
};

window.addToCoupon = function(home, away) {
    if (couponList.length >= 4) return alert("Maximum 4 matchs par coupon.");
    if (couponList.some(item => item.home === home && item.away === away)) return alert("Match déjà dans le ticket.");

    couponList.push({ home, away });
    renderCouponUI();
};

window.removeFromCoupon = function(index) {
    couponList.splice(index, 1);
    renderCouponUI();
};

function renderCouponUI() {
    const wrapper = document.getElementById('coupon-wrapper');
    if (!wrapper) return;

    if (couponList.length === 0) {
        wrapper.innerHTML = '';
        return;
    }

    let couponText = `🎟️ *COUPON COMBINÉ SMARTPRONOIA*\n`;
    couponList.forEach(m => {
        couponText += `• ${m.home} vs ${m.away}\n`;
    });

    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(couponText)}`;

    wrapper.innerHTML = `
        <div class="card" style="border: 2px solid #eab308; background: var(--card-bg);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="margin:0; color:#eab308;">🎟️ Coupon Combiné (${couponList.length}/4)</h4>
            </div>
            ${couponList.map((m, i) => `
                <div style="background:var(--inner-bg); padding:8px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; border:1px solid var(--border-color);">
                    <div>
                        <div><strong>${m.home} VS ${m.away}</strong></div>
                    </div>
                    <button onclick="removeFromCoupon(${i})" style="background:#ef4444; color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;">❌</button>
                </div>
            `).join('')}
            <a href="${shareUrl}" target="_blank" style="display:block; text-align:center; background:var(--accent); color:#000; font-weight:bold; padding:8px; border-radius:6px; text-decoration:none; font-size:0.8rem; margin-top:8px;">
                📲 Partager ce Ticket sur WhatsApp
            </a>
        </div>
    `;
}

window.selectMatch = function(home, away) {
    const homeInput = document.getElementById('home-team');
    const awayInput = document.getElementById('away-team');
    if (homeInput) homeInput.value = home;
    if (awayInput) awayInput.value = away;
    switchTab('pronos');
};

window.switchTab = function(tabName) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));

    const targetSection = document.getElementById('section-' + tabName);
    const targetTab = document.getElementById('tab-' + tabName);

    if (targetSection) targetSection.classList.add('active');
    if (targetTab) targetTab.classList.add('active');

    if (tabName === 'compte') loadHistoryUI();
};

function getCredits() {
    const saved = localStorage.getItem('smartprono_credits');
    return saved !== null ? parseInt(saved, 10) : 10;
}

function syncCreditsUI() {
    const credits = getCredits();
    const countEl = document.getElementById('credits-count');
    const accountEl = document.getElementById('account-credits');
    if (countEl) countEl.innerText = credits;
    if (accountEl) accountEl.innerText = credits;
}

function updateCredits(count) {
    localStorage.setItem('smartprono_credits', count);
    syncCreditsUI();
}

function handleGenerateAnalysis() {
    const homeInput = document.getElementById('home-team');
    const awayInput = document.getElementById('away-team');
    const home = homeInput ? homeInput.value.trim() : '';
    const away = awayInput ? awayInput.value.trim() : '';

    if (!home || !away) {
        alert("Entrez deux équipes !");
        return;
    }

    let credits = getCredits();
    if (credits <= 0) {
        alert("Plus de jetons ! Rechargez dans l'onglet Compte.");
        return;
    }

    updateCredits(credits - 1);

    saveAnalysisToHistory({ home, away, date: new Date().toLocaleDateString('fr-FR') });

    const oldCard = document.getElementById('ai-result-card');
    if (oldCard) oldCard.remove();

    const plainText = `⚽ SmartPronoIA\n${home} vs ${away}\nAnalyse générée avec succès.`;
    const shareText = encodeURIComponent(plainText);

    const card = document.createElement('div');
    card.id = 'ai-result-card';
    card.className = 'card';
    card.style.cssText = "background: var(--card-bg); border: 2px solid var(--primary); margin-top: 15px;";

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="margin:0; color:var(--primary); font-size:1rem;">🧠 Analyse SmartPronoIA</h4>
        </div>

        <div style="text-align:center; padding: 10px; background:var(--inner-bg); border-radius:8px; margin-bottom:12px; border:1px solid var(--border-color);">
            <div style="font-size:0.95rem; font-weight:bold;">
                ${home} <span style="color:var(--primary);">VS</span> ${away}
            </div>
        </div>

        <div style="display:flex; gap:8px;">
            <a href="https://api.whatsapp.com/send?text=${shareText}" target="_blank" 
               style="flex:2; text-align:center; background:var(--accent); color:#000; font-weight:bold; padding:10px; border-radius:8px; text-decoration:none; font-size:0.8rem;">
                📲 Partager sur WhatsApp
            </a>
            <button onclick="copyToClipboard('${plainText.replace(/\n/g, '\\n')}')" 
                    style="flex:1; background:var(--inner-bg); color:var(--text-color); border:1px solid var(--border-color); font-weight:bold; padding:10px; border-radius:8px; font-size:0.8rem; cursor:pointer;">
                📋 Copier
            </button>
        </div>
    `;

    const cardSelection = document.getElementById('card-selection');
    if (cardSelection) {
        cardSelection.after(card);
        card.scrollIntoView({ behavior: 'smooth' });
    }
}

window.copyToClipboard = function(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            alert("📋 Pronostic copié dans le presse-papier !");
        }).catch(() => alert("Copié !"));
    } else {
        alert("📋 Résumé :\n\n" + text);
    }
};

function saveAnalysisToHistory(item) {
    let history = JSON.parse(localStorage.getItem('smartprono_history')) || [];
    history.unshift(item);
    if (history.length > 5) history.pop();
    localStorage.setItem('smartprono_history', JSON.stringify(history));
}

function loadHistoryUI() {
    const container = document.getElementById('history-container');
    if (!container) return;

    let history = JSON.parse(localStorage.getItem('smartprono_history')) || [];
    if (history.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:10px; color:var(--text-muted); font-size:0.85rem;">Aucune analyse enregistrée.</div>`;
        return;
    }

    container.innerHTML = history.map(h => `
        <div style="background:var(--inner-bg); border:1px solid var(--border-color); padding:8px 10px; border-radius:6px; margin-bottom:6px;">
            <div style="font-weight:bold; font-size:0.85rem; color:var(--primary);">${h.home} VS ${h.away}</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">Généré le ${h.date}</div>
        </div>
    `).join('');
}

window.clearHistory = function() {
    localStorage.removeItem('smartprono_history');
    loadHistoryUI();
};

function setupEventListeners() {
    const btnGen = document.getElementById('btn-generate');
    if (btnGen) btnGen.onclick = handleGenerateAnalysis;

    const btnRechargeAd = document.getElementById('btn-recharge-ad');
    if (btnRechargeAd) {
        btnRechargeAd.onclick = () => {
            btnRechargeAd.disabled = true;

            let timer = 5;
            const interval = setInterval(() => {
                btnRechargeAd.innerText = `⏳ Pub en cours (${timer}s)...`;
                timer--;
                if (timer < 0) {
                    clearInterval(interval);
                    updateCredits(getCredits() + 5);
                    btnRechargeAd.innerText = `🎬 Regarder une pub (+5 Jetons)`;
                    btnRechargeAd.disabled = false;
                    alert("🎉 FÉLICITATIONS ! +5 Jetons ont été crédités à votre compte.");
                }
            }, 1000);
        };
    }
}