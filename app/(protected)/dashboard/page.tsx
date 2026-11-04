import type { LucideIcon } from "lucide-react";
import { ArrowRight, Briefcase, Building2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { texts } from "@/texts";

import { QuickSearch } from "./components/quick-search";

const modules = [
  {
    href: "/companies",
    icon: Building2,
    title: texts.navCompanies,
    desc: texts.dashboardCompaniesDesc,
  },
  {
    href: "/job-offers",
    icon: Briefcase,
    title: texts.navJobOffers,
    desc: texts.dashboardJobsDesc,
  },
] satisfies readonly {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}[];

const zoneLabel =
  "text-muted-foreground text-[10px] font-medium tracking-[0.08em] uppercase";

// Two search directions, kept visually distinct: PROSPEZIONE scans the
// wild (radar), ARCHIVIO holds the qualified companies ("le schede").
export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 p-6">
      <Suspense
        fallback={
          <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
        }
      >
        <Greeting />
      </Suspense>

      {/* Prospezione — the radar: find NEW companies and open offers */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <span className={zoneLabel}>{texts.navGroupProspecting}</span>
          <h2 className="text-lg font-semibold">
            {texts.dashboardProspectingTitle}
          </h2>
        </div>
        <QuickSearch />
        <div className="bg-card divide-border rounded-md border">
          <div className="divide-y">
            {modules.map(({ href, icon: Icon, title, desc }) => (
              <Link
                key={href}
                href={href}
                className="hover:bg-muted/50 group flex items-center gap-4 px-4 py-3.5 transition-colors"
              >
                <Icon className="text-muted-foreground size-5 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium">{title}</span>
                  <span className="text-muted-foreground truncate text-sm">
                    {desc}
                  </span>
                </span>
                <span className="text-primary flex items-center gap-1 text-sm font-medium">
                  {texts.openAction}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Archivio — the schedario: qualified companies, searched later */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <span className={zoneLabel}>{texts.navGroupArchive}</span>
          <h2 className="text-lg font-semibold">
            {texts.dashboardArchiveTitle}
          </h2>
          <p className="text-muted-foreground text-sm">
            {texts.dashboardArchiveDesc}
          </p>
        </div>
        <div className="bg-card rounded-md border p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                aria-hidden="true"
                className="border-border flex flex-col gap-2 rounded-md border border-dashed p-3.5"
              >
                <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
                  {texts.schedaLabel} —
                </span>
                <span className="bg-muted h-4 w-2/3 rounded" />
                <span className="bg-muted h-3 w-1/2 rounded" />
                <span className="bg-muted h-3 w-3/5 rounded" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              {texts.dashboardArchiveHint}
            </p>
            <Link
              href="/saved"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {texts.openAction}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

async function Greeting() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-semibold">
        {texts.dashboardGreeting}
        {user.name ? `, ${user.name}` : ""}
      </h1>
      <p className="text-muted-foreground">{texts.dashboardPrompt}</p>
    </div>
  );
}
