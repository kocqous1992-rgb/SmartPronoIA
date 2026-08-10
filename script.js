Navigation entre onglets
window.switchTab = function(tabName) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));

    const targetSection = document.getElementById(`section-${tabName}`);
    const targetTab = document.getElementById(`tab-${tabName}`);

    if (targetSection) targetSection.classList.add('active');
    if (targetTab) targetTab.classList.add('active');
};

// Sélection d'un match depuis la liste
window.selectMatch = function(home, away) {
    document.getElementById('home-team').value = home;
    document.getElementById('away-team').value = away;
    window.switchTab('pronos');
};

// Synchronisation des jetons
function getCredits() {
    const saved = localStorage.getItem('smartprono_credits');
    return saved !== null ? parseInt(saved, 10) : 10;
}

function updateCreditsUI(count) {
    localStorage.setItem('smartprono_credits', count);
    const countElem = document.getElementById('credits-count');
    const accElem = document.getElementById('account-credits');
    if (countElem) countElem.innerText = count;
    if (accElem) accElem.innerText = count;
}

// Génération de l'analyse IA
window.handleGenerateAnalysis = function() {
    const home = document.getElementById('home-team')?.value.trim();
    const away = document.getElementById('away-team')?.value.trim();

    if (!home || !away) {
        alert("Saisissez deux équipes !");
        return;
    }

    let credits = getCredits();
    if (credits <= 0) {
        alert("Plus de jetons ! Allez dans l'onglet Compte pour en ajouter.");
        return;
    }

    // Déduction d'un jeton
    credits--;
    updateCreditsUI(credits);

    // Calculs de probabilité
    const winHome = Math.floor(Math.random() * 25) + 50;
    const winAway = Math.floor(Math.random() * 20) + 15;
    const draw = 100 - (winHome + winAway);
    const confidence = Math.floor(Math.random() * 10) + 85;
    const goalsPredict = (Math.random() * 1.2 + 1.8).toFixed(1);
    const advice = winHome > 55 ? `Victoire ${home}` : 'Plus de 1.5 Buts';

    // Supprime l'ancienne carte s'il y en a une
    const oldCard = document.getElementById('ai-result-card');
    if (oldCard) oldCard.remove();

    const shareText = encodeURIComponent(`⚽ Pronostic SmartPronoIA\n${home} vs ${away}\n🎯 Conseil: ${advice}\n🔥 Confiance: ${confidence}%`);

    // Création de la carte de résultat avec jauges visuelles
    const card = document.createElement('div');
    card.id = 'ai-result-card';
    card.className = 'card';
    card.style.cssText = "border: 2px solid #38bdf8; background: #1e293b; margin-top: 15px;";

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
};

// Recharger les jetons
window.rechargeCredits = function() {
    let credits = getCredits() + 5;
    updateCreditsUI(credits);
    alert("🎉 +5 Jetons ajoutés à votre solde !");
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    updateCreditsUI(getCredits());
});