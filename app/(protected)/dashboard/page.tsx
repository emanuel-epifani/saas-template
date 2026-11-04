import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookmarkPlus,
  Briefcase,
  Building2,
  ListChecks,
  Radar,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { RegisterToScheda } from "@/components/register-to-scheda";
import { requireUser } from "@/lib/auth/session";
import { findListsByUser } from "@/lib/saved/repo";
import { texts } from "@/texts";

import { ArchiveLists } from "./components/archive-lists";
import { QuickSearch } from "./components/quick-search";

const modules = [
  {
    href: "/companies",
    icon: Building2,
    title: texts.navSearchCompanies,
    desc: texts.dashboardCompaniesDesc,
  },
  {
    href: "/job-offers",
    icon: Briefcase,
    title: texts.navSearchJobs,
    desc: texts.dashboardJobsDesc,
  },
] satisfies readonly {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}[];

const flowSteps = [
  {
    href: "/companies",
    icon: Radar,
    title: texts.flowStepSearchTitle,
    desc: texts.flowStepSearchDesc,
  },
  {
    href: "/saved",
    icon: BookmarkPlus,
    title: texts.flowStepSaveTitle,
    desc: texts.flowStepSaveDesc,
  },
  {
    href: "/saved",
    icon: ListChecks,
    title: texts.flowStepDecideTitle,
    desc: texts.flowStepDecideDesc,
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

      {/* The workflow as a 3-step routing slip — teaches the cycle */}
      <div className="grid gap-3 sm:grid-cols-3">
        {flowSteps.map(({ href, icon: Icon, title, desc }, i) => (
          <Link
            key={title}
            href={href}
            className="group bg-card hover:bg-muted/50 relative flex flex-col gap-1.5 rounded-md border p-4 transition-colors"
          >
            <span className="flex items-center justify-between">
              <Icon className="text-muted-foreground size-4" />
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
            </span>
            <span className="font-medium">{title}</span>
            <span className="text-muted-foreground text-sm">{desc}</span>
            {i < flowSteps.length - 1 ? (
              <ArrowRight className="text-muted-foreground/60 bg-background absolute top-1/2 -right-[7px] hidden size-4 -translate-y-1/2 sm:block" />
            ) : null}
          </Link>
        ))}
      </div>

      {/* Two directions, side by side: fuori (radar) vs dentro (archivio) */}
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        {/* Prospezione — the radar: find NEW companies and open offers */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <span className={zoneLabel}>{texts.navGroupProspecting}</span>
            <h2 className="text-lg font-semibold">
              {texts.dashboardProspectingTitle}
            </h2>
            <p className="text-muted-foreground text-sm">
              {texts.dashboardProspectingDesc}
            </p>
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
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-0.5">
            <span className={zoneLabel}>{texts.navGroupArchive}</span>
            <h2 className="text-lg font-semibold">
              {texts.dashboardArchiveTitle}
            </h2>
            <p className="text-muted-foreground text-sm">
              {texts.dashboardArchiveDesc}
            </p>
          </div>
          <Suspense
            fallback={
              <div className="bg-card h-40 animate-pulse rounded-md border" />
            }
          >
            <RecentLists />
          </Suspense>
        </section>
      </div>
    </main>
  );
}

// Le liste dell'utente per tipo — specchio della colonna prospezione:
// «salvate» a destra risponde a «cerca» a sinistra, stessa dicotomia.
async function RecentLists() {
  const user = await requireUser();
  const lists = await findListsByUser(user.id);

  if (lists.length === 0) {
    return (
      <div className="bg-card rounded-md border">
        <div className="flex flex-col gap-3 px-4 py-5">
          <p className="text-muted-foreground text-sm">
            {texts.dashboardArchiveHint}
          </p>
          <RegisterToScheda />
        </div>
      </div>
    );
  }

  return <ArchiveLists lists={lists} />;
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
