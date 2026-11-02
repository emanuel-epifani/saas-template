// All user-facing copy lives here — flat keys, `as const`, no nesting.
export const texts = {
  appName: "SaaS Template",
  appTagline:
    "Trova aziende da contattare e offerte di lavoro da cui aprire nuove partnership.",

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
  footerNote: "SaaS Template — strumento di prospecting per recruiter.",

  ctaDashboard: "Vai alla dashboard",
  openAction: "Apri",
  featureCompaniesTitle: "Cerca aziende",
  featureCompaniesDesc:
    "Trova aziende per settore e zona, con contatti e mappa, da proporre come partner.",
  featureJobsTitle: "Cerca offerte di lavoro",
  featureJobsDesc:
    "Cerca offerte aperte per piazzare i tuoi candidati e aprire un contatto con l'azienda.",
  featurePrivateTitle: "Privato di default",
  featurePrivateDesc: "Ogni ricerca resta protetta dal tuo account.",

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
  jobOffersTitle: "Cerca offerte di lavoro",
  jobOffersSubtitle: "Cerca offerte aperte per i tuoi candidati.",
  jobOffersTermLabel: "Ruolo",
  jobOffersTermPlaceholder: "pizzaiolo, manutentore…",
  cityLabel: "Zona",
  cityPlaceholder: "Collegno…",
  searchAction: "Cerca",
  searching: "Ricerca…",
  jobApplyAction: "Vai all'offerta",
  jobDetailsEmpty: "Seleziona un'offerta per vedere i dettagli.",
  openSiteAction: "Apri in una nuova scheda",

  savedTitle: "Salvati",
  savedSubtitle: "Aziende e offerte che hai messo da parte.",
  savedEmptyTitle: "Presto disponibile",
  savedEmptyDesc:
    "Potrai salvare aziende e offerte dai risultati per ritrovarle qui e ricontattarle.",
} as const;
