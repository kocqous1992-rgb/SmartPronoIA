const EXTENDED_LEAGUES = [
    { value: "Ligue 1", name: "⚽ Ligue 1 (France)" },
    { value: "Premier League", name: "🇬🇧 Premier League (Angleterre)" },
    { value: "La Liga", name: "🇪🇸 La Liga (Espagne)" },
    { value: "Serie A", name: "🇮🇹 Serie A (Italie)" },
    { value: "Bundesliga", name: "🇩🇪 Bundesliga (Allemagne)" },
    { value: "UEFA Champions League", name: "🏆 Champions League" },
    { value: "CAF Champions League", name: "🌍 Ligue des Champions CAF" },
    { value: "Saudi Pro League", name: "🇸🇦 Saudi Pro League" }
];

const MATCHES_DATA = [
    { home: "Paris SG", away: "Marseille", league: "⚽ Ligue 1 (France)" },
    { home: "Real Madrid", away: "FC Barcelona", league: "🇪🇸 La Liga (Espagne)" },
    { home: "Arsenal", away: "Manchester City", league: "🇬🇧 Premier League (Angleterre)" },
    { home: "Bayern München", away: "Dortmund", league: "🇩🇪 Bundesliga (Allemagne)" },
    { home: "Inter", away: "AC Milan", league: "🇮🇹 Serie A (Italie)" },
    { home: "Al Ahly", away: "Zamalek", league: "🌍 Ligue des Champions CAF" }
];

let couponList = [];

document.addEventListener('DOMContentLoaded', () => {
    populateLeagueSelect();
    renderMatchesList();
    syncCreditsUI();
    setupEventListeners();
    loadHistoryUI();
});

function populateLeagueSelect() {
    const select = document.getElementById('league-select');
    if (!select) return;
    select.innerHTML = EXTENDED_LEAGUES.map(l => `<option value="${l.value}">${l.name}</option>`).join('');
}

function renderMatchesList() {
    const container = document.getElementById('matches-container');
    const liveContainer = document.getElementById('live-matches-container');

    const html = MATCHES_DATA.map(m => `
        <div style="background: #0f172a; margin: 8px 0; padding: 10px; border-radius: 6px; border: 1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
            <div style="flex:1; cursor:pointer;" onclick="selectMatch('${m.home}', '${m.away}')">
                <div style="font-size: 0.75rem; color: #94a3b8;">${m.league}</div>
                <div style="font-size: 0.85rem; font-weight: 600;">${m.home} <span style="color: #38bdf8;">VS</span> ${m.away}</div>
            </div>
            <div style="display:flex; gap:5px;">
                <button onclick="selectMatch('${m.home}', '${m.away}')" style="background:#334155; color:#38bdf8; border:1px solid #38bdf8; padding:5px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">Choisir</button>
                <button onclick="addToCoupon('${m.home}', '${m.away}')" style="background:#eab308; color:#000; border:none; padding:5px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">+ Ticket</button>
            </div>
        </div>
    `).join('');

    if (container) container.innerHTML = html;
    if (liveContainer) liveContainer.innerHTML = html;
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

    wrapper.innerHTML = `
        <div class="card" style="border: 2px solid #eab308; background: #1e293b;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="margin:0; color:#eab308;">🎟️ Coupon Combiné (${couponList.length}/4)</h4>
                <span style="font-size:0.85rem;">Cote Totale : <strong style="color:#22c55e; font-size:1.1rem;">${totalOdds}</strong></span>
            </div>
            ${couponList.map((m, i) => `
                <div style="background:#0f172a; padding:8px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; border:1px solid #334155;">
                    <div>
                        <div><strong>${m.home} VS ${m.away}</strong></div>
                        <div style="color:#22c55e;">💡 ${m.advice} (Cote : ${m.odds})</div>
                    </div>
                    <button onclick="removeFromCoupon(${i})" style="background:#ef4444; color:white; border:none; border-radius:4px; padding:4px 8px; cursor:pointer;">❌</button>
                </div>
            `).join('')}
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

    // OPTION C : SAUVEGARDER L'ANALYSE DANS L'HISTORIQUE
    saveAnalysisToHistory({ home, away, advice, confidence, date: new Date().toLocaleDateString('fr-FR') });

    const oldCard = document.getElementById('ai-result-card');
    if (oldCard) oldCard.remove();

    const shareText = encodeURIComponent(`⚽ Pronostic SmartPronoIA\n${home} vs ${away}\n🎯 Conseil: ${advice}\n🔥 Confiance: ${confidence}%`);

    const card = document.createElement('div');
    card.id = 'ai-result-card';
    card.className = 'card';
    card.style.cssText = "background: #1e293b; border: 2px solid #38bdf8; margin-top: 15px;";

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="margin:0; color:#38bdf8; font-size:1rem;">🧠 Analyse SmartPronoIA</h4>
            <span style="background:rgba(34, 197, 94, 0.2); color:#22c55e; border: 1px solid #22c55e; padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold;">
                Confiance : ${confidence}%
            </span>
        </div>

        <div style="text-align:center; padding: 10px; background:#0f172a; border-radius:8px; margin-bottom:12px; border:1px solid #334155;">
            <div style="font-size:0.95rem; font-weight:bold; color:#f8fafc;">
                ${home} <span style="color:#38bdf8;">VS</span> ${away}
            </div>
        </div>

        <div style="background:#0f172a; padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid #334155;">
            <div style="font-size:0.75rem; font-weight:bold; color:#94a3b8; margin-bottom:8px;">📊 PROBABILITÉS DU MATCH</div>
            <div style="display:flex; height:10px; border-radius:5px; overflow:hidden; background:#334155; margin-bottom:10px;">
                <div style="width:${winHome}%; background:#38bdf8;"></div>
                <div style="width:${draw}%; background:#eab308;"></div>
                <div style="width:${winAway}%; background:#ef4444;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
                <div style="color:#38bdf8;">🔵 ${home} : <strong>${winHome}%</strong></div>
                <div style="color:#eab308;">🟡 Nul : <strong>${draw}%</strong></div>
                <div style="color:#ef4444;">🔴 ${away} : <strong>${winAway}%</strong></div>
            </div>
        </div>

        <div style="background:#0f172a; padding:12px; border-radius:8px; border-left: 4px solid #22c55e; margin-bottom:12px;">
            <div style="font-size:0.75rem; color:#94a3b8; font-weight:bold;">🎯 CONSEIL SÉLECTIONNÉ</div>
            <div style="color:#22c55e; font-size:1rem; font-weight:bold; margin-top:4px;">${advice}</div>
            <div style="color:#cbd5e1; font-size:0.75rem; margin-top:4px;">Moyenne buts : <strong style="color:#38bdf8;">${goalsPredict}</strong></div>
        </div>

        <a href="https://api.whatsapp.com/send?text=${shareText}" target="_blank" 
           style="display:block; text-align:center; background:#22c55e; color:#000; font-weight:bold; padding:10px; border-radius:8px; text-decoration:none; font-size:0.85rem;">
            📲 Partager le Pronostic sur WhatsApp
        </a>
    `;

    document.getElementById('card-selection').after(card);
    card.scrollIntoView({ behavior: 'smooth' });
}

// FONCTIONS HISTORIQUE (OPTION C)
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
        container.innerHTML = `<div style="text-align:center; padding:10px; color:#94a3b8; font-size:0.85rem;">Aucune analyse enregistrée.</div>`;
        return;
    }

    container.innerHTML = history.map(h => `
        <div style="background:#0f172a; border:1px solid #334155; padding:8px 10px; border-radius:6px; margin-bottom:6px;">
            <div style="font-weight:bold; font-size:0.85rem; color:#38bdf8;">${h.home} VS ${h.away}</div>
            <div style="font-size:0.8rem; color:#22c55e;">💡 ${h.advice} (${h.confidence}% Confiance)</div>
            <div style="font-size:0.7rem; color:#94a3b8;">Généré le ${h.date}</div>
        </div>
    `).join('');
}

// SIMULATION RECHARGE PUB (OPTION D)
function setupEventListeners() {
    document.getElementById('btn-generate')?.addEventListener('click', handleGenerateAnalysis);
    
    const btnRechargeAd = document.getElementById('btn-recharge-ad');
    if (btnRechargeAd) {
        btnRechargeAd.onclick = () => {
            btnRechargeAd.disabled = true;
            let timer = 5;
            const interval = setInterval(() => {
                btnRechargeAd.innerText = `⏳ Visionnage de la pub (${timer}s)...`;
                timer--;
                if (timer < 0) {
                    clearInterval(interval);
                    updateCredits(getCredits() + 5);
                    btnRechargeAd.innerText = `🎬 Regarder une pub (+5 Jetons)`;
                    btnRechargeAd.disabled = false;
                    alert("🎉 FÉLICITATIONS ! +5 Jetons ont été crédités.");
                }
            }, 1000);
        };
    }
}