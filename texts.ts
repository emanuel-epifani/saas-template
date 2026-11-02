// All user-facing copy lives here — flat keys, `as const`, no nesting.
export const texts = {
  appName: "SaaS Template",
  appTagline: "The starting point for your next product.",

  verifyEmailSubject: "Verify your email address",
  verifyEmailHeading: "Verify your email address",
  verifyEmailBody: "Confirm this address to activate your account.",
  verifyEmailAction: "Verify email",

  resetPasswordSubject: "Reset your password",
  resetPasswordHeading: "Reset your password",
  resetPasswordBody:
    "You requested a password reset. The link expires in one hour.",
  resetPasswordAction: "Reset password",

  changeEmailSubject: "Confirm your new email address",
  changeEmailHeading: "Confirm your new email address",
  changeEmailBody:
    "You requested to change the email on your account. Confirm this address to complete the change.",
  changeEmailAction: "Confirm new email",

  emailIgnoreNote: "If you did not request this, you can ignore this email.",

  navDashboard: "Dashboard",
  navCompanies: "Companies",
  navJobOffers: "Job offers",
  navSignIn: "Sign in",
  navGetStarted: "Get started",
  footerNote: "SaaS Template — built with Next.js.",

  ctaDashboard: "Open dashboard",
  featureCompaniesTitle: "Search companies",
  featureCompaniesDesc:
    "Find local businesses by type and city, with contacts and a map.",
  featureJobsTitle: "Search job offers",
  featureJobsDesc: "Browse open roles and jump straight to the listing.",
  featurePrivateTitle: "Private by default",
  featurePrivateDesc: "Every search stays behind your account.",

  dashboardGreeting: "Welcome back",
  dashboardCompaniesTitle: "Companies",
  dashboardCompaniesDesc: "Search businesses by type and city.",
  dashboardJobsTitle: "Job offers",
  dashboardJobsDesc: "Search open roles by title and city.",

  companiesTitle: "Search companies",
  companiesTermLabel: "Business type",
  companiesTermPlaceholder: "pizzeria, metalmeccaniche…",
  loadMore: "Load more",
  resultsLabel: "results",
  jobOffersTitle: "Search job offers",
  jobOffersTermLabel: "Role",
  jobOffersTermPlaceholder: "pizzaiolo, manutentore…",
  cityLabel: "City",
  cityPlaceholder: "Collegno…",
  searchAction: "Search",
  searching: "Searching…",
  jobApplyAction: "Go to offer",
  jobDetailsEmpty: "Select a job offer to see the details.",
  openSiteAction: "Open in new tab",
} as const;
