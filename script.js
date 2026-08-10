color: var(--primary);">VS</span> ${match.strAwayTeam}
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

    