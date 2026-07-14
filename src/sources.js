// ---------------------------------------------------------------------------
// MAPPA FONTI — modifica solo questo file per aggiungere aziende/fonti.
//
// Per ogni regione:
//  - newsQueries : query passate a Google News (RSS). Cronaca e annunci.
//  - linkSources : pagine-elenco istituzionali (BUR, albi pretori, concorsi,
//                  delibere). Da queste estraiamo SOLO i link il cui titolo
//                  contiene parole-chiave trasfusionali (vedi LINK_KEYWORDS).
// ---------------------------------------------------------------------------

const KW = `("servizio trasfusionale" OR SIMT OR "medicina trasfusionale" OR "officina trasfusionale" OR "centro trasfusionale" OR "piano sangue" OR "rete trasfusionale" OR emocomponenti OR plasmaderivati OR aferesi OR immunoematologia)`;

// Parole-chiave per filtrare i link di BUR/albi: SOLO ambito trasfusionale,
// così dai bollettini regionali peschiamo gli atti pertinenti e non tutto.
export const LINK_KEYWORDS = [
  "trasfusional", "simt", "immunoematolog", "emocomponen", "plasmaderiv",
  "plasma", "sangue", "aferesi", "emovigilanza", "officina trasfusionale",
  "piano sangue", "centro regionale sangue", "donatori", "donazione",
];

export const REGIONS = [
  {
    name: "Abruzzo",
    newsQueries: [
      `${KW} (Abruzzo OR "Centro Regionale Sangue")`,
      `${KW} (Pescara OR "ASL Pescara")`,
      `${KW} (Chieti OR Lanciano OR Vasto)`,
      `${KW} (L'Aquila OR Avezzano OR Sulmona)`,
      `${KW} (Teramo OR "ASL Teramo")`,
      `(nomina OR primario OR "direttore UOC" OR concorso) ("medicina trasfusionale" OR SIMT) Abruzzo`,
    ],
    linkSources: [
      "https://bura.regione.abruzzo.it/cerca", // BUR: elenco atti con titoli in HTML (ottima fonte)
      "https://www.asl.pe.it/BandiConcorsi.jsp",
      "https://trasparenza.asl1abruzzo.it/pagina639_bandi-di-concorso.html",
      "https://www.aslteramo.it/concorsi-ed-avvisi/",
    ],
  },
  {
    name: "Molise",
    newsQueries: [
      `${KW} (Molise OR ASReM)`,
      `${KW} (Campobasso OR Bojano OR Larino)`,
      `${KW} (Isernia OR Venafro OR Agnone)`,
      `${KW} (Termoli OR "San Timoteo")`,
      `${KW} ("Cardarelli Campobasso" OR "Veneziale Isernia" OR "Gemelli Molise")`,
      `(nomina OR primario OR "direttore UOC" OR concorso) ("medicina trasfusionale" OR SIMT) Molise`,
    ],
    linkSources: [
      "https://www.regione.molise.it/flex/FixedPages/IT/DelibereDiGiunta.php/L/IT", // delibere di giunta
      "https://www.asrem.molise.it/", // home/news ASReM
    ],
  },
  {
    name: "Marche",
    // BUR Marche = PDF settimanali: qui le news sono il canale primario.
    newsQueries: [
      `${KW} (Marche OR DIRMT)`,
      `${KW} (Ancona OR Torrette OR "AOU delle Marche")`,
      `${KW} (Pesaro OR Fano OR Urbino OR "Marche Nord")`,
      `${KW} (Macerata OR "Civitanova Marche")`,
      `${KW} (Fermo OR "Ascoli Piceno" OR "San Benedetto del Tronto")`,
      `(nomina OR primario OR "direttore UOC" OR concorso) ("medicina trasfusionale" OR SIMT) Marche`,
    ],
    linkSources: [
      "https://www.regione.marche.it/Entra-in-Regione/Atti-della-Regione", // best effort
      "http://www.trasfusionalemarche.org/",
    ],
  },
  {
    name: "Puglia",
    // Regione grande (6 province): una query per provincia + capoluoghi e ospedali principali.
    newsQueries: [
      `${KW} (Puglia OR "coordinamento regionale attività trasfusionali" OR "centro regionale sangue Puglia")`,
      `${KW} (Bari OR "Policlinico di Bari" OR "San Paolo Bari" OR "Di Venere" OR Altamura OR Monopoli OR Putignano)`,
      `${KW} (Foggia OR "Policlinico Riuniti" OR "San Giovanni Rotondo" OR "Casa Sollievo della Sofferenza" OR Cerignola OR "San Severo" OR Manfredonia)`,
      `${KW} (Barletta OR Andria OR Trani OR Bisceglie OR "ASL BT" OR "Bonomo Andria")`,
      `${KW} (Brindisi OR "Perrino" OR "Francavilla Fontana" OR Ostuni)`,
      `${KW} (Lecce OR "Vito Fazzi" OR Galatina OR Casarano OR Gallipoli OR Copertino OR Scorrano)`,
      `${KW} (Taranto OR "SS. Annunziata Taranto" OR "Martina Franca" OR Manduria OR Grottaglie)`,
      `(nomina OR primario OR "direttore UOC" OR concorso) ("medicina trasfusionale" OR SIMT) Puglia`,
    ],
    linkSources: [
      "https://burp.regione.puglia.it/", // BUR Puglia (best effort)
      "https://www.sanita.puglia.it/", // portale PugliaSalute: news e concorsi (best effort)
    ],
  },
  {
    name: "Umbria",
    // Due province (Perugia, Terni) + principali centri con presidi ospedalieri.
    newsQueries: [
      `${KW} (Umbria OR "USL Umbria 1" OR "USL Umbria 2" OR "centro regionale sangue Umbria")`,
      `${KW} (Perugia OR "Santa Maria della Misericordia" OR Assisi OR "Città di Castello" OR Gubbio OR Castiglione del Lago)`,
      `${KW} (Foligno OR "San Giovanni Battista Foligno" OR Spoleto OR Todi OR Marsciano)`,
      `${KW} (Terni OR "Santa Maria di Terni" OR Orvieto OR Narni OR Amelia)`,
      `(nomina OR primario OR "direttore UOC" OR concorso) ("medicina trasfusionale" OR SIMT) Umbria`,
    ],
    linkSources: [
      "https://www.regione.umbria.it/la-regione/bollettino-ufficiale", // BUR Umbria (best effort)
    ],
  },
];
