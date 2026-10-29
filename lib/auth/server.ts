import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { env } from "@/env";
import { db } from "@/lib/db";
import {
  changeEmailEmail,
  resetPasswordEmail,
  sendEmail,
  verifyEmailEmail,
} from "@/lib/email";
import { texts } from "@/texts";

export const auth = betterAuth({
  appName: texts.appName,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),
  user: {
    deleteUser: { enabled: true },
    changeEmail: {
      enabled: true,
      // Verified users get a confirmation link at the NEW address;
      // the email only changes after they click it.
      sendChangeEmailConfirmation: async ({ newEmail, url }) => {
        await sendEmail(changeEmailEmail(newEmail, url));
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Sign-in is rejected until the email is verified.
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(resetPasswordEmail(user.email, url));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(verifyEmailEmail(user.email, url));
    },
  },
  // In-memory rate limiting on sensitive endpoints (sign-in, reset, ...).
  // For multi-instance deployments move this to Redis via `rateLimit.storage`.
  rateLimit: { enabled: true },
  // Lets Server Actions set/clear session cookies through next/headers.
  plugins: [nextCookies()],
});
