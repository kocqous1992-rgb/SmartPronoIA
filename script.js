/* =========================================================
   SMARTPRONOIA - SCRIPT COMPLET
   Matchs réels : TheSportsDB
   ========================================================= */

const EXTENDED_LEAGUES = [
    { value: "ALL", name: "🌐 Toutes" },
    { value: "Ligue 1", name: "⚽ Ligue 1" },
    { value: "Premier League", name: "🇬🇧 Premier League" },
    { value: "La Liga", name: "🇪🇸 La Liga" },
    { value: "Serie A", name: "🇮🇹 Serie A" },
    { value: "Bundesliga", name: "🇩🇪 Bundesliga" },
    { value: "UEFA Champions League", name: "🏆 Champions League" },
    { value: "CAF Champions League", name: "🌍 CAF" },
    { value: "Saudi Pro League", name: "🇸🇦 Saudi League" },
    { value: "OTHER", name: "🌍 Autres" }
];


/* =========================================================
   DONNÉES DES MATCHS
   Le tableau commence vide.
   Les vrais matchs seront chargés depuis TheSportsDB.
   ========================================================= */

const MATCHES_DATA = [];

let couponList = [];
let currentFilterLeague = "ALL";


/* =========================================================
   INITIALISATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    populateLeagueSelect();
    renderLeaguePills();

    syncCreditsUI();
    setupEventListeners();
    loadHistoryUI();

    if (localStorage.getItem("smartprono_theme") === "light") {
        document.body.classList.add("light-mode");
    }

    // Chargement des vrais matchs
    loadRealMatches();
});


/* =========================================================
   DATE LOCALE
   Évite les problèmes de décalage UTC
   ========================================================= */

function getTodayLocalDate() {

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


/* =========================================================
   CHARGEMENT DES MATCHS RÉELS THE SPORTS DB
   ========================================================= */

async function loadRealMatches() {

    const container = document.getElementById("matches-container");
    const status = document.getElementById("matches-api-status");

    if (!container) return;

    container.innerHTML = `
        <div style="
            text-align:center;
            padding:20px;
            color:var(--text-muted);
        ">
            ⏳ Chargement des matchs réels...
        </div>
    `;

    if (status) {
        status.innerHTML = "🌐 Connexion à TheSportsDB...";
    }

    try {

        const today = getTodayLocalDate();

        const apiUrl =
            `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?s=Soccer&d=${today}`;

        console.log("TheSportsDB URL :", apiUrl);

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();

        console.log("Réponse TheSportsDB :", data);

        /*
         * L'API peut renvoyer :
         * events: [...]
         * ou events: null
         */

        if (!data || !Array.isArray(data.events) || data.events.length === 0) {

            MATCHES_DATA.length = 0;

            container.innerHTML = `
                <div style="
                    text-align:center;
                    padding:20px;
                    color:var(--text-muted);
                ">
                    ⚠️ Aucun match trouvé pour aujourd'hui.
                    <br>
                    <small>
                        Date recherchée : ${formatDateFrench(today)}
                    </small>
                </div>
            `;

            if (status) {
                status.innerHTML =
                    `🌐 TheSportsDB • Aucun match trouvé • ${formatDateFrench(today)}`;
            }

            renderLiveMatchesList();

            return;
        }


        /* =====================================================
           REMPLACER LES ANCIENNES DONNÉES
           ===================================================== */

        MATCHES_DATA.length = 0;


        /* =====================================================
           TRANSFORMATION DES MATCHS API
           ===================================================== */

        data.events.forEach(event => {

            MATCHES_DATA.push({

                id: event.idEvent || "",

                home: event.strHomeTeam || "Équipe domicile",

                away: event.strAwayTeam || "Équipe extérieure",

                leagueRaw: event.strLeague || "Autre championnat",

                league: normalizeLeague(event.strLeague),

                leagueName:
                    event.strLeague ||
                    "⚽ Football",

                date:
                    event.dateEvent ||
                    today,

                time:
                    event.strTime ||
                    "",

                status:
                    event.strStatus ||
                    "",

                homeScore:
                    event.intHomeScore,

                awayScore:
                    event.intAwayScore,

                venue:
                    event.strVenue ||
                    "",

                country:
                    event.strCountry ||
                    ""

            });

        });


        /* =====================================================
           AFFICHAGE
           ===================================================== */

        if (status) {

            status.innerHTML =
                `🟢 Connecté à TheSportsDB • ` +
                `${MATCHES_DATA.length} match(s) trouvé(s) • ` +
                `${formatDateFrench(today)}`;

        }


        renderMatchesList(MATCHES_DATA);

        renderLiveMatchesList();


        console.log(
            `${MATCHES_DATA.length} matchs réels chargés.`
        );


    } catch (error) {

        console.error(
            "Erreur TheSportsDB :",
            error
        );

        MATCHES_DATA.length = 0;

        container.innerHTML = `
            <div style="
                text-align:center;
                padding:20px;
                color:#ef4444;
            ">

                <div style="font-size:1.8rem;">
                    ⚠️
                </div>

                <strong>
                    Impossible de charger les matchs
                </strong>

                <br>

                <small style="color:var(--text-muted);">
                    Vérifiez votre connexion Internet.
                </small>

                <br><br>

                <button
                    onclick="loadRealMatches()"
                    style="
                        background:var(--primary);
                        color:white;
                        border:none;
                        padding:8px 14px;
                        border-radius:7px;
                        font-weight:bold;
                        cursor:pointer;
                    "
                >
                    🔄 Réessayer
                </button>

            </div>
        `;

        if (status) {
            status.innerHTML =
                "🔴 Erreur de connexion à TheSportsDB";
        }

        renderLiveMatchesList();
    }
}


/* =========================================================
   NORMALISATION DES CHAMPIONNATS
   ========================================================= */

function normalizeLeague(leagueName) {

    if (!leagueName) {
        return "OTHER";
    }

    const league = leagueName.toLowerCase();


    if (
        league.includes("ligue 1") ||
        league.includes("french ligue 1") ||
        league.includes("france")
    ) {
        return "Ligue 1";
    }


    if (
        league.includes("premier league") ||
        league.includes("english premier")
    ) {
        return "Premier League";
    }


    if (
        league.includes("la liga") ||
        league.includes("spanish")
    ) {
        return "La Liga";
    }


    if (
        league.includes("serie a") ||
        league.includes("italian")
    ) {
        return "Serie A";
    }


    if (
        league.includes("bundesliga") ||
        league.includes("german")
    ) {
        return "Bundesliga";
    }


    if (
        league.includes("champions league") &&
        !league.includes("caf")
    ) {
        return "UEFA Champions League";
    }


    if (
        league.includes("caf") ||
        league.includes("african champions")
    ) {
        return "CAF Champions League";
    }


    if (
        league.includes("saudi") ||
        league.includes("saudi pro")
    ) {
        return "Saudi Pro League";
    }


    return "OTHER";
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDateFrench(dateString) {

    if (!dateString) return "";

    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


/* =========================================================
   FORMAT HEURE
   ========================================================= */

function formatMatchTime(time) {

    if (!time) {
        return "Heure inconnue";
    }

    return time.substring(0, 5);
}


/* =========================================================
   CHAMPIONNATS
   ========================================================= */

function populateLeagueSelect() {

    const select =
        document.getElementById("league-select");

    if (!select) return;

    select.innerHTML =
        EXTENDED_LEAGUES
            .map(league => `
                <option value="${league.value}">
                    ${league.name}
                </option>
            `)
            .join("");
}


/* =========================================================
   BOUTONS CHAMPIONNATS
   ========================================================= */

function renderLeaguePills() {

    const container =
        document.getElementById("league-pills-container");

    if (!container) return;

    container.innerHTML =
        EXTENDED_LEAGUES
            .map(league => `
                <div
                    class="pill ${
                        league.value === currentFilterLeague
                            ? "active"
                            : ""
                    }"
                    onclick="selectLeaguePill('${league.value}')"
                >
                    ${league.name}
                </div>
            `)
            .join("");
}


/* =========================================================
   SÉLECTION CHAMPIONNAT
   ========================================================= */

window.selectLeaguePill = function(leagueValue) {

    currentFilterLeague = leagueValue;

    const select =
        document.getElementById("league-select");

    if (select) {
        select.value = leagueValue;
    }

    renderLeaguePills();

    filterMatches();
};


/* =========================================================
   FILTRAGE
   ========================================================= */

window.filterMatches = function() {

    const select =
        document.getElementById("league-select");

    const search =
        document.getElementById("search-input");


    const selectedLeague =
        select ? select.value : "ALL";


    const searchInput =
        search
            ? search.value.toLowerCase().trim()
            : "";


    currentFilterLeague = selectedLeague;

    renderLeaguePills();


    let filtered =
        [...MATCHES_DATA];


    if (selectedLeague !== "ALL") {

        filtered =
            filtered.filter(match =>
                match.league === selectedLeague
            );
    }


    if (searchInput !== "") {

        filtered =
            filtered.filter(match =>

                match.home
                    .toLowerCase()
                    .includes(searchInput)

                ||

                match.away
                    .toLowerCase()
                    .includes(searchInput)

                ||

                match.leagueName
                    .toLowerCase()
                    .includes(searchInput)

            );
    }


    renderMatchesList(filtered);
};


/* =========================================================
   AFFICHAGE DES MATCHS
   ========================================================= */

function renderMatchesList(list) {

    const container =
        document.getElementById("matches-container");

    if (!container) return;


    if (!list || list.length === 0) {

        container.innerHTML = `
            <div style="
                text-align:center;
                padding:20px;
                color:var(--text-muted);
            ">
                ⚠️ Aucun match correspondant.
            </div>
        `;

        return;
    }


    const html =
        list.map(match => {

            const scoreAvailable =
                match.homeScore !== null &&
                match.homeScore !== undefined &&
                match.awayScore !== null &&
                match.awayScore !== undefined;


            const score =
                scoreAvailable
                    ? `${match.homeScore} - ${match.awayScore}`
                    : "";


            return `

            <div
                style="
                    background:var(--inner-bg);
                    margin:8px 0;
                    padding:12px;
                    border-radius:8px;
                    border:1px solid var(--border-color);
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:7px;
                    "
                >

                    <span
                        style="
                            font-size:0.7rem;
                            color:var(--text-muted);
                        "
                    >
                        ⚽ ${escapeHTML(match.leagueName)}
                    </span>

                    <span
                        style="
                            font-size:0.7rem;
                            color:var(--accent);
                            font-weight:bold;
                        "
                    >
                        🕐 ${formatMatchTime(match.time)}
                    </span>

                </div>


                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:8px;
                    "
                >

                    <div
                        style="
                            flex:1;
                            cursor:pointer;
                        "
                        onclick="
                            selectMatch(
                                '${escapeAttribute(match.home)}',
                                '${escapeAttribute(match.away)}'
                            )
                        "
                    >

                        <div
                            style="
                                font-size:0.9rem;
                                font-weight:700;
                            "
                        >
                            ${escapeHTML(match.home)}

                            <span
                                style="
                                    color:var(--primary);
                                    margin:0 4px;
                                "
                            >
                                VS
                            </span>

                            ${escapeHTML(match.away)}
                        </div>


                        ${
                            score
                                ? `
                                    <div
                                        style="
                                            margin-top:4px;
                                            font-size:0.8rem;
                                            color:var(--accent);
                                            font-weight:bold;
                                        "
                                    >
                                        🏆 Score : ${score}
                                    </div>
                                `
                                : ""
                        }

                    </div>


                    <div
                        style="
                            display:flex;
                            gap:5px;
                        "
                    >

                        <button
                            onclick="
                                selectMatch(
                                    '${escapeAttribute(match.home)}',
                                    '${escapeAttribute(match.away)}'
                                )
                            "
                            style="
                                background:var(--card-bg);
                                color:var(--primary);
                                border:1px solid var(--primary);
                                padding:6px 8px;
                                border-radius:6px;
                                font-size:0.7rem;
                                font-weight:bold;
                            "
                        >
                            Analyser
                        </button>


                        <button
                            onclick="
                                addToCoupon(
                                    '${escapeAttribute(match.home)}',
                                    '${escapeAttribute(match.away)}'
                                )
                            "
                            style="
                                background:#eab308;
                                color:#000;
                                border:none;
                                padding:6px 8px;
                                border-radius:6px;
                                font-size:0.7rem;
                                font-weight:bold;
                            "
                        >
                            + Ticket
                        </button>

                    </div>

                </div>

            </div>

            `;

        }).join("");


    container.innerHTML = html;
}


/* =========================================================
   MATCHS EN DIRECT
   ========================================================= */

function renderLiveMatchesList() {

    const container =
        document.getElementById(
            "live-matches-container"
        );

    if (!container) return;


    const liveMatches =
        MATCHES_DATA.filter(match =>
            isMatchLive(match)
        );


    if (liveMatches.length === 0) {

        container.innerHTML = `
            <div
                style="
                    text-align:center;
                    padding:20px;
                    color:var(--text-muted);
                "
            >
                🔵 Aucun match en direct détecté.
            </div>
        `;

        return;
    }


    container.innerHTML =
        liveMatches
            .map(match => {

                const score =
                    match.homeScore !== null &&
        