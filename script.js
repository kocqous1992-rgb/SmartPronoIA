let credits = 10;

// === 1. RECUPERATION DES MATCHS VIA SCRIPT DYNAMIQUE ===
function fetchFootballData() {
    const upcomingContainer = document.querySelector('.upcoming-matches');
    if (upcomingContainer) {
        upcomingContainer.innerHTML = '<h3>🗓️ Matchs Réels du Jour</h3><p style="font-size:12px;color:#94a3b8;">Chargement des données en direct...</p>';
    }

    // Nettoyage de l'ancien script s'il existe
    const oldScript = document.getElementById('jsonp-football-script');
    if (oldScript) oldScript.remove();

    // Injection du script pour contourner la sécurité du navigateur mobile
    const script = document.createElement('script');
    script.id = 'jsonp-football-script';
    script.src = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?callback=handleEspnResponse';
    
    // Gestion d'erreur si le réseau coupe
    script.onerror = function() {
        if (upcomingContainer) {
            upcomingContainer.innerHTML = '<h3>🗓️ Matchs Réels du Jour</h3><p style="font-size:12px;color:#ef4444;">Impossible de se connecter au réseau.</p>';
        }
    };

    document.body.appendChild(script);
}

// Fonction globale appelée automatiquement par l'API
window.handleEspnResponse = function(data) {
    const upcomingContainer = document.querySelector('.upcoming-matches');
    const liveContainer = document.getElementById('section-live');

    if (!data || !data.events || data.events.length === 0) {
        if (upcomingContainer) {
            upcomingContainer.innerHTML = '<h3>🗓️ Matchs Réels du Jour</h3><p style="font-size:12px;color:#94a3b8;">Aucun match disponible pour le moment.</p>';
        }
        return;
    }

    // 1. Remplissage des matchs du jour
    if (upcomingContainer) {
        upcomingContainer.innerHTML = '<h3>🗓️ Matchs Réels du Jour</h3>';
        
        data.events.slice(0, 15).forEach(event => {
            const comp = event.competitions[0];
            const league = event.league?.name || "Football";
            const home = comp?.competitors[0]?.team?.shortDisplayName || "Équipe 1";
            const away = comp?.competitors[1]?.team?.shortDisplayName || "Équipe 2";
            const status = event.status?.type?.shortDetail || "À venir";

            const div = document.createElement('div');
            div.className = 'match-item';
            div.onclick = () => selectMatch(home, away, league);
            div.innerHTML = `
                <span class="m-league">${league.substring(0, 12)}</span>
                <span class="m-teams">${home} 🆚 ${away}</span>
                <span class="m-time">${status}</span>
            `;
            upcomingContainer.appendChild(div);
        });
    }

    // 2. Remplissage de l'onglet En Direct
    if (liveContainer) {
        liveContainer.innerHTML = `
            <section class="card">
                <h2>📺 Matchs En Direct / Du Jour</h2>
                <div id="live-list"></div>
            </section>
        `;
        const liveList = document.getElementById('live-list');

        data.events.slice(0, 8).forEach(event => {
            const comp = event.competitions[0];
            const home = comp.competitors[0].team.shortDisplayName;
            const away = comp.competitors[1].team.shortDisplayName;
            const scoreHome = comp.competitors[0].score || "0";
            const scoreAway = comp.competitors[1].score || "0";
            const time = event.status.type.shortDetail;

            const div = document.createElement('div');
            div.className = 'live-item ongoing';
            div.innerHTML = `
                <span class="m-league">🏆 ${event.league?.name || 'Football'}</span>
                <div class="live-score">
                    <span class="l-team">${home}</span>
                    <span class="l-score">${scoreHome} - ${scoreAway}</span>
                    <span class="l-team">${away}</span>
                </div>
                <span class="l-time">🔴 ${time}</span>
            `;
            liveList.appendChild(div);
        });
    }
};

// === 2. ALGORITHME DE PRÉDICTION ===
const btnPredict = document.getElementById('btn-predict');
if (btnPredict) {
    btnPredict.addEventListener('click', () => {
        const team1 = document.getElementById('team1').value.trim();
        const team2 = document.getElementById('team2').value.trim();

        if (!team1 || !team2) {
            alert("Veuillez remplir les deux équipes !");
            return;
        }

        if (credits <= 0) {
            alert("Jetons épuisés !");
            return;
        }

        credits--;
        document.getElementById('credits-count').innerText = credits;

        const homePower = (team1.length % 5) + 3;
        const awayPower = (team2.length % 5) + 2;
        const total = homePower + awayPower;
        
        const winProb = Math.round((homePower / total) * 100);
        const winner = winProb > 55 ? team1 : (winProb < 45 ? team2 : "Match Nul");
        const tip = winProb > 60 ? `Victoire ${team1}` : "Plus de 1.5 Buts";

        document.getElementById('pred-winner').innerText = winner;
        document.getElementById('pred-percent').innerText = `${winProb}%`;
        document.getElementById('pred-tip').innerText = tip;
        document.getElementById('pred-score').innerText = `${Math.max(0, homePower - 2)} - ${Math.max(0, awayPower - 2)}`;
        document.getElementById('pred-form').innerText = "🟢 🟢 🟠 🟢 🔴";

        document.getElementById('result-card').classList.remove('hidden');
    });
}

// === 3. NAVIGATION ET SÉLECTION ===
function showSection(sectionName) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));

    const section = document.getElementById(`section-${sectionName}`);
    if (section) section.classList.remove('hidden');

    const activeTab = document.querySelector(`.tab-item[onclick="showSection('${sectionName}')"]`);
    if (activeTab) activeTab.classList.add('active');
}

function selectMatch(teamHome, teamAway, leagueName) {
    document.getElementById('team1').value = teamHome;
    document.getElementById('team2').value = teamAway;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Exécution au chargement
fetchFootballData();