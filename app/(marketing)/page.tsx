import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Building2, Check } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import type { NavTone } from "@/app/models";
import { toneTileClasses } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { texts } from "@/texts";

import { ProductPreview } from "./components/product-preview";

const steps = [
  { n: 1, title: texts.stepSearchTitle, desc: texts.stepSearchDesc },
  { n: 2, title: texts.stepEvaluateTitle, desc: texts.stepEvaluateDesc },
  { n: 3, title: texts.stepContactTitle, desc: texts.stepContactDesc },
] as const;

const modules = [
  {
    title: texts.navCompanies,
    tone: "companies",
    icon: Building2,
    benefits: [
      texts.companiesBenefit1,
      texts.companiesBenefit2,
      texts.companiesBenefit3,
    ],
  },
  {
    title: texts.navJobOffers,
    tone: "jobs",
    icon: Briefcase,
    benefits: [texts.jobsBenefit1, texts.jobsBenefit2, texts.jobsBenefit3],
  },
] satisfies readonly {
  title: string;
  tone: Exclude<NavTone, "primary">;
  icon: LucideIcon;
  benefits: readonly string[];
}[];

const toneIconClass = {
  companies: "text-companies",
  jobs: "text-jobs",
} as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-24 px-4 py-20 sm:py-24">
      {/* Hero */}
      <section className="relative flex flex-col items-center gap-6 text-center">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-20 -z-10 h-72 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent)]"
        />
        <Badge variant="secondary">{texts.heroEyebrow}</Badge>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          {texts.heroTitleLead}{" "}
          <span className="text-primary">{texts.heroTitleAccent}</span>
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          {texts.heroSubtitle}
        </p>
        <Suspense>
          <Cta />
        </Suspense>
      </section>

      {/* Product preview */}
      <section>
        <ProductPreview />
      </section>

      {/* Come funziona */}
      <section className="flex flex-col gap-10">
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          {texts.howItWorksTitle}
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((s) => (
            <div
              key={s.n}
              className="flex flex-col items-center gap-3 text-center"
            >
              <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full text-sm font-semibold">
                {s.n}
              </span>
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="text-muted-foreground max-w-xs text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two modules */}
      <section className="grid gap-4 sm:grid-cols-2">
        {modules.map((m) => (
          <Card key={m.title}>
            <CardHeader>
              <div
                className={cn(
                  "grid size-10 place-items-center rounded-xl",
                  toneTileClasses[m.tone],
                )}
              >
                <m.icon className="size-5" />
              </div>
              <CardTitle>{m.title}</CardTitle>
              <CardDescription>
                <ul className="flex flex-col gap-2 pt-2">
                  {m.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check
                        className={cn("size-4 shrink-0", toneIconClass[m.tone])}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      {/* Final CTA band */}
      <section className="bg-primary text-primary-foreground rounded-3xl p-10 text-center sm:p-14">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {texts.ctaBandTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-md opacity-90">{texts.ctaBandDesc}</p>
        <div className="mt-6 flex justify-center">
          <Suspense>
            <Cta variant="secondary" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Cta({ variant }: { variant?: "default" | "secondary" }) {
  const session = await getSession();
  const v = variant ?? "default";

  if (session) {
    return (
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: v, size: "xl" })}
      >
        {texts.ctaDashboard}
      </Link>
    );
  }

  return (
    <div className="flex gap-3">
      <Link
        href="/auth/sign-in"
        className={buttonVariants({
          variant: v === "secondary" ? "secondary" : "outline",
          size: "xl",
        })}
      >
        {texts.navSignIn}
      </Link>
      <Link
        href="/auth/sign-up"
        className={buttonVariants({ variant: v, size: "xl" })}
      >
        {texts.navGetStarted}
      </Link>
    </div>
  );
}
