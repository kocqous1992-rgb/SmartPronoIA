const EXTENDED_LEAGUES = [
    { value: "ALL", name: "🌐 Toutes" },
    { value: "Ligue 1", name: "⚽ Ligue 1" },
    { value: "Premier League", name: "🇬🇧 Premier League" },
    { value: "La Liga", name: "🇪🇸 La Liga" },
    { value: "Serie A", name: "🇮🇹 Serie A" },
    { value: "Bundesliga", name: "🇩🇪 Bundesliga" },
    { value: "UEFA Champions League", name: "🏆 Champions League" },
    { value: "CAF Champions League", name: "🌍 CAF" },
    { value: "Saudi Pro League", name: "🇸🇦 Saudi League" }
];

const MATCHES_DATA = [
    { home: "Paris SG", away: "Marseille", league: "Ligue 1", leagueName: "⚽ Ligue 1 (France)", live: true, scoreHome: 2, scoreAway: 1, minute: "64'" },
    { home: "Real Madrid", away: "FC Barcelona", league: "La Liga", leagueName: "🇪🇸 La Liga (Espagne)", live: true, scoreHome: 1, scoreAway: 1, minute: "38'" },
    { home: "Arsenal", away: "Manchester City", league: "Premier League", leagueName: "🇬🇧 Premier League (Angleterre)", live: true, scoreHome: 0, scoreAway: 0, minute: "12'" },
    { home: "Lyon", away: "Monaco", league: "Ligue 1", leagueName: "⚽ Ligue 1 (France)", live: false },
    { home: "Atletico Madrid", away: "Sevilla", league: "La Liga", leagueName: "🇪🇸 La Liga (Espagne)", live: false },
    { home: "Liverpool", away: "Chelsea", league: "Premier League", leagueName: "🇬🇧 Premier League (Angleterre)", live: false },
    { home: "Bayern München", away: "Dortmund", league: "Bundesliga", leagueName: "🇩🇪 Bundesliga (Allemagne)", live: false },
    { home: "Inter", away: "AC Milan", league: "Serie A", leagueName: "🇮🇹 Serie A (Italie)", live: false },
    { home: "Juventus", away: "Napoli", league: "Serie A", leagueName: "🇮🇹 Serie A (Italie)", live: false },
    { home: "Al Ahly", away: "Zamalek", league: "CAF Champions League", leagueName: "🌍 Ligue des Champions CAF", live: false },
    { home: "Wydad Casablanca", away: "Raja Casablanca", league: "CAF Champions League", leagueName: "🌍 Ligue des Champions CAF", live: false },
    { home: "Al Hilal", away: "Al Nassr", league: "Saudi Pro League", leagueName: "🇸🇦 Saudi Pro League", live: false }
];

let couponList = [];
let currentFilterLeague = "ALL";

document.addEventListener('DOMContentLoaded', () => {
    populateLeagueSelect();
    renderLeaguePills();
    renderMatchesList(MATCHES_DATA);
    renderLiveMatchesList();
    syncCreditsUI();
    setupEventListeners();
    loadHistoryUI();

    if (localStorage.getItem('smartprono_theme') === 'light') {
        document.body.classList.add('light-mode');
    }
});

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
    const selectedLeague = document.getElementById('league-select').value;
    currentFilterLeague = selectedLeague;
    renderLeaguePills();

    const searchInput = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

    let filtered = MATCHES_DATA;

    if (selectedLeague !== 'ALL') {
        filtered = filtered.filter(m => m.league === selectedLeague);
    }

    if (searchInput !== '') {
        filtered = filtered.filter(m => 
            m.home.toLowerCase().includes(searchInput) || 
            m.away.toLowerCase().includes(searchInput)
        );
    }

    renderMatchesList(filtered);
};

function renderMatchesList(list) {
    const container = document.getElementById('matches-container');

    if (!list || list.length === 0) {
        if (container) container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--text-muted);">Aucun match trouvé.</div>`;
        return;
    }

    const html = list.map(m => `
        <div style="background: var(--inner-bg); margin: 8px 0; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1; cursor:pointer;" onclick="selectMatch('${m.home.replace(/'/g, "\\'")}', '${m.away.replace(/'/g, "\\'")}')">
                <div style="font-size: 0.75rem; color: var(--text-muted);">${m.leagueName}</div>
                <div style="font-size: 0.85rem; font-weight: 600;">${m.home} <span style="color: var(--primary);">VS</span> ${m.away}</div>
            </div>
            <div style="display:flex; gap:5px;">
                <button onclick="selectMatch('${m.home.replace(/'/g, "\\'")}', '${m.away.replace(/'/g, "\\'")}')" style="background:var(--card-bg); color:var(--primary); border:1px solid var(--primary); padding:5px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">Choisir</button>
                <button onclick="addToCoupon('${m.home.replace(/'/g, "\\'")}', '${m.away.replace(/'/g, "\\'")}')" style="background:#eab308; color:#000; border:none; padding:5px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">+ Ticket</button>
            </div>
        </div>
    `).join('');

    if (container) container.innerHTML = html;
}

function renderLiveMatchesList() {
    const liveContainer = document.getElementById('live-matches-container');
    if (!liveContainer) return;

    const liveSelection = MATCHES_DATA.filter(m => m.live);

    liveContainer.innerHTML = liveSelection.map(m => `
        <div style="background: var(--inner-bg); margin: 8px 0; padding: 12px; border-radius: 6px; border: 1px solid #ef4444;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:0.75rem; color:var(--text-muted);">${m.leagueName}</span>
                <span style="background:#ef4444; color:white; font-size:0.65rem; font-weight:bold; padding:2px 6px; border-radius:10px;">🔴 ${m.minute}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size: 0.85rem; font-weight: bold; flex:1;">
                    ${m.home} <span style="color:#ef4444; margin:0 4px;">${m.scoreHome} - ${m.scoreAway}</span> ${m.away}
                </div>
                <button onclick="selectMatch('${m.home.replace(/'/g, "\\'")}', '${m.away.replace(/'/g, "\\'")}')" style="background:var(--card-bg); color:var(--primary); border:1px solid var(--primary); padding:5px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">Analyser</button>
            </div>
        </div>
    `).join('');
}

window.addToCoupon = function(home, away) {
    if (couponList.length >= 4) return alert("Maximum 4 matchs par coupon.");
    if (couponList.some(item => item.home === home && item.away === away)) return alert("Match déjà dans le ticket.");

    const odds = (Math.random() * 0.4 + 1.35).toFixed(2);
    const adviceOptions = [`Victoire ${home}`, 'Plus de 1.5 Buts', 'Les deux équipes marquant'];
    const advice = adviceOptions[Math.floor(Math.random() * adviceOptions.length)];

    couponList.push({ home, away, odds, advice });
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

    const totalOdds = couponList.reduce((acc, m) => acc * parseFloat(m.odds), 1).toFixed(2);

    let couponText = `🎟️ *COUPON COMBINÉ SMARTPRONOIA*\n`;
    couponList.forEach(m => {
        couponText += `• ${m.home} vs ${m.away} -> ${m.advice} (Cote: ${m.odds})\n`;
    });
    couponText += `🔥 *Cote Totale : ${totalOdds}*`;

    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(couponText)}`;

    wrapper.innerHTML = `
        <div class="card" style="border: 2px solid #eab308; background: var(--card-bg);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="margin:0; color:#eab308;">🎟️ Coupon Combiné (${couponList.length}/4)</h4>
                <span style="font-size:0.85rem;">Cote Totale : <strong style="color:var(--accent); font-size:1.1rem;">${totalOdds}</strong></span>
            </div>
            ${couponList.map((m, i) => `
                <div style="background:var(--inner-bg); padding:8px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; border:1px solid var(--border-color);">
                    <div>
                        <div><strong>${m.home} VS ${m.away}</strong></div>
                        <div style="color:var(--accent);">💡 ${m.advice} (Cote : ${m.odds})</div>
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
    document.getElementById('home-team').value = home;
    document.getElementById('away-team').value = away;
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
    document.getElementById('credits-count').innerText = credits;
    document.getElementById('account-credits').innerText = credits;
}

function updateCredits(count) {
    localStorage.setItem('smartprono_credits', count);
    syncCreditsUI();
}

function handleGenerateAnalysis() {
    const home = document.getElementById('home-team').value.trim();
    const away = document.getElementById('away-team').value.trim();

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

    const winHome = Math.floor(Math.random() * 25) + 50;
    const winAway = Math.floor(Math.random() * 20) + 15;
    const draw = 100 - (winHome + winAway);
    const confidence = Math.floor(Math.random() * 10) + 85;
    const goalsPredict = (Math.random() * 1.2 + 1.8).toFixed(1);
    const advice = winHome > 55 ? 'Victoire ' + home : 'Plus de 1.5 Buts';

    saveAnalysisToHistory({ home, away, advice, confidence, date: new Date().toLocaleDateString('fr-FR') });

    const oldCard = document.getElementById('ai-result-card');
    if (oldCard) oldCard.remove();

    const plainText = `⚽ SmartPronoIA\n${home} vs ${away}\n🎯 Conseil: ${advice}\n🔥 Confiance: ${confidence}%`;
    const shareText = encodeURIComponent(plainText);

    const card = document.createElement('div');
    card.id = 'ai-result-card';
    card.className = 'card';
    card.style.cssText = "background: var(--card-bg); border: 2px solid var(--primary); margin-top: 15px;";

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="margin:0; color:var(--primary); font-size:1rem;">🧠 Analyse SmartPronoIA</h4>
            <span style="background:rgba(34, 197, 94, 0.2); color:var(--accent); border: 1px solid var(--accent); padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold;">
                Confiance : ${confidence}%
            </span>
        </div>

        <div style="text-align:center; padding: 10px; background:var(--inner-bg); border-radius:8px; margin-bottom:12px; border:1px solid var(--border-color);">
            <div style="font-size:0.95rem; font-weight:bold;">
                ${home} <span style="color:var(--primary);">VS</span> ${away}
            </div>
        </div>

        <div style="background:var(--inner-bg); padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid var(--border-color);">
            <div style="font-size:0.75rem; font-weight:bold; color:var(--text-muted); margin-bottom:8px;">📊 PROBABILITÉS DU MATCH</div>
            <div style="display:flex; height:10px; border-radius:5px; overflow:hidden; background:var(--border-color); margin-bottom:10px;">
                <div style="width:${winHome}%; background:var(--primary);"></div>
                <div style="width:${draw}%; background:#eab308;"></div>
                <div style="width:${winAway}%; background:#ef4444;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                <div style="color:var(--primary);">🔵 ${home} : <strong>${winHome}%</strong></div>
                <div style="color:#eab308;">🟡 Nul : <strong>${draw}%</strong></div>
                <div style="color:#ef4444;">🔴 ${away} : <strong>${winAway}%</strong></div>
            </div>
        </div>

        <div style="background:var(--inner-bg); padding:12px; border-radius:8px; border-left: 4px solid var(--accent); margin-bottom:12px;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:bold;">🎯 CONSEIL SÉLECTIONNÉ</div>
            <div style="color:var(--accent); font-size:1rem; font-weight:bold; margin-top:4px;">${advice}</div>
            <div style="color:var(--text-color); font-size:0.75rem; margin-top:4px;">Moyenne buts : <strong style="color:var(--primary);">${goalsPredict}</strong></div>
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

    document.getElementById('card-selection').after(card);
    card.scrollIntoView({ behavior: 'smooth' });
}

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("📋 Pronostic copié dans le presse-papier !");
    }).catch(() => {
        alert("Impossible de copier automatiquement.");
    });
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
            <div style="font-size:0.8rem; color:var(--accent);">💡 ${h.advice} (${h.confidence}% Confiance)</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">Généré le ${h.date}</div>
        </div>
    `).join('');
}

window.clearHistory = function() {
    localStorage.removeItem('smartprono_history');
    loadHistoryUI();
};

function setupEventListeners() {
    document.getElementById('btn-generate')?.addEventListener('click', handleGenerateAnalysis);

    const btnRechargeAd = document.getElementById('btn-recharge-ad');
    if (btnRechargeAd) {
        btnRechargeAd.onclick = () => {
            btnRechargeAd.disabled = true;

            if (typeof show_8854321 === 'function') {
                show_8854321().then(() => {
                    updateCredits(getCredits() + 5);
                    btnRechargeAd.disabled = false;
                });
            } else {
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
            }
        };
    }
}