// All user-facing copy lives here — flat keys, `as const`, no nesting.
export const texts = {
  appName: "Scout",
  appTagline:
    "Il radar dei recruiter: trova aziende da contattare e offerte da cui aprire nuove partnership.",

  verifyEmailSubject: "Verifica il tuo indirizzo email",
  verifyEmailHeading: "Verifica il tuo indirizzo email",
  verifyEmailBody: "Conferma questo indirizzo per attivare il tuo account.",
  verifyEmailAction: "Verifica email",

  resetPasswordSubject: "Reimposta la tua password",
  resetPasswordHeading: "Reimposta la tua password",
  resetPasswordBody:
    "Hai richiesto il ripristino della password. Il link scade tra un'ora.",
  resetPasswordAction: "Reimposta password",

  changeEmailSubject: "Conferma il tuo nuovo indirizzo email",
  changeEmailHeading: "Conferma il tuo nuovo indirizzo email",
  changeEmailBody:
    "Hai richiesto di cambiare l'email del tuo account. Conferma questo indirizzo per completare il cambio.",
  changeEmailAction: "Conferma nuova email",

  emailIgnoreNote:
    "Se non hai richiesto questa operazione, puoi ignorare questa email.",

  navGroupGeneral: "Generale",
  navGroupProspecting: "Prospecting",
  navGroupWork: "Il tuo lavoro",
  navDashboard: "Dashboard",
  navCompanies: "Aziende",
  navJobOffers: "Offerte di lavoro",
  navSaved: "Salvati",
  navAccount: "Account",
  navSignIn: "Accedi",
  navGetStarted: "Inizia ora",
  soonBadge: "Presto",
  sidebarToggleLabel: "Apri/chiudi barra laterale",
  footerNote: "© Scout — prospecting per recruiter e agenzie per il lavoro.",

  ctaDashboard: "Vai alla dashboard",
  openAction: "Apri",

  heroEyebrow: "Per recruiter e agenzie per il lavoro",
  heroTitleLead: "Trova le aziende giuste. Apri",
  heroTitleAccent: "nuove partnership.",
  heroSubtitle:
    "Cerca aziende per settore e zona, scopri chi sta assumendo e contatta le persone giuste — tutto da un'unica schermata.",

  howItWorksTitle: "Come funziona",
  stepSearchTitle: "Cerca",
  stepSearchDesc: "Imposta settore o ruolo e la zona in cui operi.",
  stepEvaluateTitle: "Valuta",
  stepEvaluateDesc:
    "Contatti, sito, posizione sulla mappa e offerte aperte, a colpo d'occhio.",
  stepContactTitle: "Contatta",
  stepContactDesc:
    "Chiama, scrivi o proponi un candidato: la partnership parte da qui.",

  companiesBenefit1: "Ricerca per settore e raggio",
  companiesBenefit2: "Telefono, indirizzo e sito in un click",
  companiesBenefit3: "Mappa dell'area con tutti i risultati",
  jobsBenefit1: "Offerte aperte per ruolo e zona",
  jobsBenefit2: "Dettaglio, retribuzione e fonte dell'annuncio",
  jobsBenefit3: "Link diretto all'annuncio originale",

  ctaBandTitle: "Il tuo prossimo cliente è già in zona.",
  ctaBandDesc: "Crea un account e inizia a cercare in meno di un minuto.",

  dashboardGreeting: "Bentornato",
  dashboardPrompt: "Cosa cerchi oggi?",
  dashboardExamplesLabel: "Prova:",
  dashboardCompaniesDesc: "Aziende da contattare per una partnership.",
  dashboardJobsDesc: "Offerte aperte dove proporre i tuoi candidati.",

  companiesTitle: "Cerca aziende",
  companiesSubtitle:
    "Cerca aziende per settore e zona da contattare per una partnership.",
  companiesTermLabel: "Settore / attività",
  companiesTermPlaceholder: "pizzeria, metalmeccaniche…",
  radiusLabel: "Raggio",
  radiusCenterOption: "Centro città",
  loadMore: "Carica altri",
  resultsLabel: "risultati",
  resultsForLabel: "per",
  jobOffersTitle: "Cerca offerte di lavoro",
  jobOffersSubtitle: "Cerca offerte aperte per i tuoi candidati.",
  jobOffersTermLabel: "Ruolo",
  jobOffersTermPlaceholder: "pizzaiolo, manutentore…",
  cityLabel: "Zona",
  cityPlaceholder: "Collegno…",
  searchAction: "Cerca",
  searching: "Ricerca in corso…",
  updating: "Aggiornamento…",
  searchIdleTitle: "Inizia una ricerca",
  searchIdleDescCompanies:
    "Scegli settore e zona: troverai aziende con contatti e posizione sulla mappa.",
  searchIdleDescJobs:
    "Scegli ruolo e zona: troverai offerte aperte e l'azienda da contattare.",
  searchNoResultsTitle: "Nessun risultato",
  searchNoResultsDesc: "Prova un termine più generico o allarga la zona.",
  searchError: "Ricerca non riuscita. Riprova tra poco.",
  jobApplyAction: "Vai all'offerta",
  jobDetailsEmpty: "Seleziona un'offerta per vedere i dettagli.",
  mapIdleHint: "I risultati compariranno sulla mappa",
  jobDetailsIdle: "Avvia una ricerca: qui vedrai il dettaglio dell'offerta.",

  savedTitle: "Salvati",
  savedSubtitle: "Aziende e offerte che hai messo da parte.",
  savedEmptyTitle: "Presto disponibile",
  savedEmptyDesc:
    "Potrai salvare aziende e offerte dai risultati per ritrovarle qui e ricontattarle.",
} as const;
