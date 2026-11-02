import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { texts } from "@/texts";

// Server component: the session-dependent right side streams in behind a
// <Suspense> boundary (same pattern as the (protected) layout guard), so
// logged-out and logged-in navs never flash the wrong state client-side.
export function SiteHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold">
          {texts.appName}
        </Link>
        <Suspense>
          <SessionArea />
        </Suspense>
      </nav>
    </header>
  );
}

async function SessionArea() {
  const session = await getSession();

  if (session) {
    return (
      <Link
        href="/dashboard"
        className={buttonVariants({ size: "sm", className: "ml-auto" })}
      >
        {texts.ctaDashboard}
      </Link>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <Link
        href="/auth/sign-in"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        {texts.navSignIn}
      </Link>
      <Link href="/auth/sign-up" className={buttonVariants({ size: "sm" })}>
        {texts.navGetStarted}
      </Link>
    </div>
  );
}
