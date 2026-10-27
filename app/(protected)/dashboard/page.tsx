import { UserButton } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { texts } from "@/texts";

// First protected surface: replace with your real app shell.
// The (protected) layout already guards the segment — call requireUser()
// again only where you actually need the user object.
export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{texts.appName}</h1>
        <UserButton />
      </header>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <Greeting />
      </Suspense>
    </main>
  );
}

async function Greeting() {
  const user = await requireUser();

  return (
    <section className="flex flex-col gap-4">
      <p>
        Signed in as <strong>{user.email}</strong>.
      </p>
      <div>
        <Link
          href="/account/settings"
          className={buttonVariants({ variant: "outline" })}
        >
          Account settings
        </Link>
      </div>
    </section>
  );
}
