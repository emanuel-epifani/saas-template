import type { LucideIcon } from "lucide-react";
import { ArrowRight, Bookmark, Briefcase, Building2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
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

// First protected surface: the (protected) layout already guards the
// segment — requireUser() is called again only where the user object is
// actually needed (the greeting).
export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-6">
      <Suspense
        fallback={
          <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
        }
      >
        <Greeting />
      </Suspense>

      <QuickSearch />

      <section className="bg-card divide-border rounded-md border">
        <div className="divide-y">
          {modules.map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="hover:bg-muted/50 group flex items-center gap-4 px-4 py-4 transition-colors"
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
          <div className="flex items-center gap-4 px-4 py-4">
            <Bookmark className="text-muted-foreground size-5 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2 font-medium">
                {texts.savedTitle}
                <Badge variant="secondary">{texts.soonBadge}</Badge>
              </span>
              <span className="text-muted-foreground truncate text-sm">
                {texts.savedEmptyDesc}
              </span>
            </span>
            <Link
              href="/saved"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
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
