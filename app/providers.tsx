"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth/client";
import { authLocalization } from "@/lib/auth/localization";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <ThemeProvider
      attribute="class"
      forcedTheme="light"
      disableTransitionOnChange
    >
      <AuthUIProvider
        authClient={authClient}
        navigate={router.push}
        replace={router.replace}
        onSessionChange={router.refresh}
        Link={Link}
        basePath="/auth"
        localization={authLocalization}
        redirectTo="/dashboard"
        emailVerification
        credentials
        account
        deleteUser
      >
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors />
      </AuthUIProvider>
    </ThemeProvider>
  );
}
