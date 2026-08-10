/* =========================================================
   SMARTPRONOIA
   Gestion des matchs réels avec TheSportsDB
   ========================================================= */

/* =========================
   CONFIGURATION API
   ========================= */

// Clé gratuite TheSportsDB actuellement documentée
const SPORTSDB_API_KEY = "3";

// API V1 TheSportsDB
const SPORTSDB_BASE_URL =
    `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}`;

// Intervalle de rafraîchissement : 5 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000;


/* =========================
   CHAMPIONNATS
   ========================= */

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


/* =========================
   VARIABLES
   ========================= */

let REAL_MATCHES = [];
let couponList = [];
let currentFilterLeague = "ALL";


/* =========================
   INITIALISATION
   ========================= */

document.addEventListener("DOMContentLoaded", async () => {

    populateLeagueSelect();
    renderLeaguePills();

    syncCreditsUI();
    setupEventListeners();
    loadHistoryUI();

    // Thème
    if (localStorage.getItem("smartprono_theme") === "light") {
        document.body.classList.add("light-mode");
    }

    // Chargement initial des vrais matchs
    await loadRealMatches();

    // Chargement du direct
    await loadLiveMatches();

    // Actualisation automatique
    setInterval(async () => {
        await loadRealMatches();
        await loadLiveMatches();
    }, REFRESH_INTERVAL);
});


/* =========================
   DATE DU JOUR
   ========================= */

function getTodayDate() {

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* =========================
   DATE / HEURE
   ========================= */

function formatMatchTime(dateString, timeString) {

    if (!dateString && !timeString) {
        return "Heure inconnue";
    }

    if (timeString) {
        return timeString.substring(0, 5);
    }

    if (dateString) {

        const date = new Date(dateString);

        if (!isNaN(date.getTime())) {
            return date.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit"
            });
        }
    }

    return "Heure inconnue";
}


/* =========================
   NOM DU STATUT
   ========================= */

function getMatchStatus(match) {

    const status = String(
        match.strStatus ||
        match.strProgress ||
        ""
    ).toLowerCase();

    if (
        status.includes("finished") ||
        status.includes("final") ||
        status.includes("ft")
    ) {
        return "Terminé";
    }

    if (
        status.includes("postponed") ||
        status.includes("cancelled") ||
        status.includes("canceled")
    ) {
        return "Reporté";
    }

    if (
        status.includes("live") ||
        status.includes("1st") ||
        status.includes("2nd") ||
        status.includes("half") ||
        status.includes("period")
    ) {
        return "En direct";
    }

    return "À venir";
}


/* =========================
   NORMALISATION DES MATCHS
   ========================= */

function normalizeMatch(match) {

    const home =
        match.strHomeTeam ||
        match.strHomeTeamShort ||
        "Équipe domicile";

    const away =
        match.strAwayTeam ||
        match.strAwayTeamShort ||
        "Équipe extérieure";

    const league =
        match.strLeague ||
        "Championnat inconnu";

    const date =
        match.dateEvent ||
        "";

    const time =
        match.strTime ||
        match.strTimeLocal ||
        "";

    const status =
        getMatchStatus(match);

    return {
        id: match.idEvent,

        home: home,
        away: away,

        league: league,
        leagueName: league,

        date: date,
        time: formatMatchTime(date, time),

        status: status,

        homeScore:
            match.intHomeScore !== null &&
            match.intHomeScore !== undefined
                ? match.intHomeScore
                : null,

        awayScore:
            match.intAwayScore !== null &&
            match.intAwayScore !== undefined
                ? match.intAwayScore
                : null,

        homeBadge: match.strHomeTeamBadge || "",
        awayBadge: match.strAwayTeamBadge || "",

        venue: match.strVenue || ""
    };
}


/* =========================
   CHARGER LES MATCHS DU JOUR
   ========================= */

async function loadRealMatches() {

    const container =
        document.getElementById("matches-container");

    if (!container) return;

    container.innerHTML = `
        <div style="
            text-align:center;
            padding:15px;
            color:var(--text-muted);
        ">
            ⏳ Chargement des vrais matchs...
        </div>
    `;

    try {

        const today = getTodayDate();

        const url =
            `${SPORTSDB_BASE_URL}/eventsday.php?s=Soccer&d=${today}`;

        console.log("TheSportsDB :", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Erreur HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Réponse TheSportsDB :", data);

        const events = Array.isArray(data.events)
            ? data.events
            : [];

        REAL_MATCHES = events.map(normalizeMatch);

        if (REAL_MATCHES.length === 0) {

            container.innerHTML = `
                <div style="
                    text-align:center;
                    padding:15px;
                    color:var(--text-muted);
                ">
                    📅 Aucun match trouvé pour aujourd'hui.
                    <br>
                    <small>${today}</small>
                </div>
            `;

            return;
        }

        filterMatches();

    } catch (error) {

        console.error(
            "Erreur TheSportsDB :",
            error
        );

        container.innerHTML = `
            <div style="
                text-align:center;
                padding:15px;
                color:#ef4444;
            ">
                ❌ Impossible de récupérer les matchs.

                <br><br>

                <small>
                    ${escapeHTML(error.message)}
                </small>

                <br><br>

                <button
                    onclick="loadRealMatches()"
                    style="
                        background:var(--primary);
                        color:white;
                        border:none;
                        padding:8px 12px;
                        border-radius:6px;
                        cursor:pointer;
                    "
                >
                    🔄 Réessayer
                </button>
            </div>
        `;
    }
}


/* =========================
   CHARGER LE DIRECT
   ========================= */

async function loadLiveMatches() {

    const liveContainer =
        document.getElementById(
            "live-matches-container"
        );

    if (!liveContainer) return;

    /*
       IMPORTANT :
       Avec la V1 gratuite de TheSportsDB,
       nous ne devons PAS prendre arbitrairement
       les premiers matchs et les déclarer "En direct".

       On recherche uniquement les événements dont
       les données retournées indiquent réellement
       un statut de match en cours.
    */

    if (!REAL_MATCHES.length) {

        liveContainer.innerHTML = `
            <div style="
                text-align:center;
                padding:15px;
                color:var(--text-muted);
            ">
                ℹ️ Aucun match en direct confirmé.
            </div>
        `;

        return;
    }

    const liveMatches =
        REAL_MATCHES.filter(
            match => match.status === "En direct"
        );

    if (liveMatches.length === 0) {

        liveContainer.innerHTML = `
            <div style="
                text-align:center;
                padding:15px;
                color:var(--text-muted);
            ">
                ⚽ Aucun match en direct confirmé actuellement.
                <br>
                <small>
                    Les matchs programmés restent disponibles
                    dans l'onglet Pronos.
                </small>
            </div>
        `;

        return;
    }

    liveContainer.innerHTML =
        liveMatches.map(renderLiveMatch).join("");
}


/* =========================
   AFFICHAGE D'UN MATCH LIVE
   ========================= */

function renderLiveMatch(m) {

    const homeScore =
        m.homeScore !== null
            ? m.homeScore
            : 0;

    const awayScore =
        m.awayScore !== null
            ? m.awayScore
            : 0;

    return `
        <div style="
            background:var(--inner-bg);
            margin:8px 0;
            padding:12px;
            border-radius:6px;
            border:1px solid #ef4444;
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:8px;
            ">

                <span style="
                    font-size:0.75rem;
                    color:var(--text-muted);
                ">
                    ${escapeHTML(m.league)}
                </span>

                <span style="
                    background:#ef4444;
                    color:white;
                    font-size:0.65rem;
                    font-weight:bold;
                    padding:3px 7px;
                    border-radius:10px;
                ">
                    🔴 EN DIRECT
                </span>

            </div>

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
            ">

                <div style="
                    font-size:0.85rem;
                    font-weight:bold;
                    flex:1;
                ">

                    ${escapeHTML(m.home)}

                    <strong style="
                        color:var(--primary);
                        margin:0 5px;
                    ">
                        ${homeScore} - ${awayScore}
                    </strong>

                    ${escapeHTML(m.away)}

                </div>

                <button
                    onclick="selectMatchById('${m.id}')"
                    style="
                        background:var(--card-bg);
                        color:var(--primary);
                        border:1px solid var(--primary);
                        padding:5px 8px;
                        border-radius:6px;
                        font-size:0.75rem;
                        font-weight:bold;
                        cursor:pointer;
                    "
                >
                    Analyser
                </button>

            </div>

        </div>
    `;
}


/* =========================
   FILTRES CHAMPIONNATS
   ========================= */

function populateLeagueSelect() {

    const select =
        document.getElementById("league-select");

    if (!select) return;

    select.innerHTML =
        EXTENDED_LEAGUES.map(
            league => `
                <option value="${league.value}">
                    ${league.name}
                </option>
            `
        ).join("");
}


function renderLeaguePills() {

    const container =
        document.getElementById(
            "league-pills-container"
        );

    if (!container) return;

    container.innerHTML =
        EXTENDED_LEAGUES.map(
            league => `
                <div
                    class="pill ${
                        league.value === currentFilterLeague
                            ? "active"
                            : ""
                    }"
                    onclick="selectLeaguePill('${escapeAttribute(league.value)}')"
                >
                    ${league.name}
                </div>
            `
        ).join("");
}


window.selectLeaguePill = function(leagueValue) {

    currentFilterLeague = leagueValue;

    const select =
        document.getElementById(
            "league-select"
        );

    if (select) {
        select.value = leagueValue;
    }

    renderLeaguePills();
    filterMatches();
};


window.filterMatches = function() {

    const select =
        document.getElementById(
            "league-select"
        );

    const selectedLeague =
        select
            ? select.value
            : "ALL";

    currentFilterLeague =
        selectedLeague;

    renderLeaguePills();

    const searchInput =
        document.getElementById(
            "search-input"
        );

    const search =
        searchInput
            ? searchInput.value
                .toLowerCase()
                .trim()
            : "";

    let filtered =
        [...REAL_MATCHES];

    if (selectedLeague !== "ALL") {

        filtered =
            filtered.filter(
                match =>
                    normalizeLeagueName(match.league)
                    === normalizeLeagueName(selectedLeague)
            );
    }

    if (search !== "") {

        filtered =
            filtered.filter(match => {

                const home =
                    match.home
                        .toLowerCase();

                const away =
                    match.away
                        .toLowerCase();

                return (
                    home.includes(search) ||
                    away.includes(search)
                );
            });
    }

    renderMatchesList(filtered);
};


/* =========================
   NORMALISATION DES NOMS
   ========================= */

function normalizeLeagueName(name) {

    return String(name || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace("uefa ", "")
        .replace("saudi ", "")
        .trim();
}


/* =========================
   AFFICHAGE DES MATCHS
   ========================= */

function renderMatchesList(list) {

    const container =
        document.getElementById(
            "matches-container"
        );

    if (!container) return;

    if (!list || list.length === 0) {

        container.innerHTML = `
            <div style="
                text-align:center;
                padding:15px;
                color:var(--text-muted);
            ">
                Aucun match trouvé.
            </div>
        `;

        return;
    }

    container.innerHTML =
        list.map(renderMatchCard).join("");
}


/* =========================
   CARTE MATCH
   ========================= */

function renderMatchCard(m) {

    const scoreAvailable =
        m.homeScore !== null &&
        m.awayScore !== null;

    let statusHTML = "";

    if (m.status === "En direct") {

        statusHTML = `
            <span style="
                background:#ef4444;
                color:white;
                padding:2px 6px;
                border-radius:8px;
                font-size:0.65rem;
                font-weight:bold;
            ">
                🔴 EN DIRECT
            </span>
        `;

    } else if (m.status === "Terminé") {

        statusHTML = `
            <span style="
                color:var(--accent);
                font-size:0.7rem;
                font-weight:bold;
            ">
                ✅ Terminé
            </span>
        `;

    } else if (m.status === "Reporté") {

        statusHTML = `
            <span style="
                color:#ef4444;
                font-size:0.7rem;
                font-weight:bold;
            ">
                ⚠️ Reporté
            </span>
        `;

    } else {

        statusHTML = `
            <span style="
                color:var(--text-muted);
                font-size:0.7rem;
            ">
                🕐 ${escapeHTML(m.time)}
            </span>
        `;
    }


    const scoreHTML =
        scoreAvailable
            ? `
                <strong style="
                    color:var(--primary);
                    margin:0 5px;
                ">
                    ${m.homeScore}
                    -
                    ${m.awayScore}
                </strong>
            `
            : `
                <span style="
                    color:var(--primary);
                    margin:0 5px;
                    font-weight:bold;
                ">
                    VS
                </span>
            `;


    return `
        <div style="
            background:var(--inner-bg);
            margin:8px 0;
            padding:10px;
            border-radius:6px;
            border:1px solid var(--border-color);
        ">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:6px;
            ">

                <div style="
                    font-size:0.75rem;
                    color:var(--text-muted);
                ">
                    🏆 ${escapeHTML(m.league)}
                </div>

                ${statusHTML}

            </div>


            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:8px;
            ">

                <div
                    style="
                        flex:1;
                        cursor:pointer;
                    "
                    onclick="selectMatchById('${m.id}')"
                >

                    <div style="
                        font-size:0.85rem;
                        font-weight:600;
                    ">

                        ${escapeHTML(m.home)}

                        ${scoreHTML}

                        ${escapeHTML(m.away)}

                    </div>

                    ${
                        m.venue
                            ? `
                                <div style="
                                    font-size:0.68rem;
                                    color:var(--text-muted);
                                    margin-top:4px;
                                ">
                                    📍 ${escapeHTML(m.venue)}
                                </div>
                              `
                            : ""
                    }

                </div>


                <div style="
                    display:flex;
                    gap:5px;
                ">

                    <button
                        onclick="selectMatchById('${m.id}')"
                        style="
                            background:var(--card-bg);
                            color:var(--primary);
                            border:1px solid var(--primary);
                            padding:5px 8px;
                            border-radius:6px;
                            font-size:0.75rem;
                            font-weight:bold;
                            cursor:pointer;
                        "
                    >
                        Choisir
                    </button>

                    <button
                        onclick="addToCouponById('${m.id}')"
                        