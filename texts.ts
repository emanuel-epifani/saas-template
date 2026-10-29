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
} as const;
