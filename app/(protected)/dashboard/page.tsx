import { Briefcase, Building2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { texts } from "@/texts";

const cards = [
  {
    href: "/companies",
    icon: Building2,
    title: texts.dashboardCompaniesTitle,
    desc: texts.dashboardCompaniesDesc,
  },
  {
    href: "/job-offers",
    icon: Briefcase,
    title: texts.dashboardJobsTitle,
    desc: texts.dashboardJobsDesc,
  },
] as const;

// First protected surface: the (protected) layout already guards the
// segment — requireUser() is called again only where the user object is
// actually needed (the greeting).
export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-8">
      <Suspense
        fallback={
          <div className="bg-muted h-8 w-48 animate-pulse rounded-md" />
        }
      >
        <Greeting />
      </Suspense>
      <section className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-muted/50 h-full transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="text-muted-foreground size-5" />
                  <CardTitle>{title}</CardTitle>
                </div>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}

async function Greeting() {
  const user = await requireUser();

  return (
    <h1 className="text-2xl font-semibold tracking-tight">
      {texts.dashboardGreeting}
      {user.name ? `, ${user.name}` : ""}
    </h1>
  );
}
