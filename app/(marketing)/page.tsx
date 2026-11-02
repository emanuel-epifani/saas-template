import { Briefcase, Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { texts } from "@/texts";

const features = [
  {
    icon: Building2,
    title: texts.featureCompaniesTitle,
    desc: texts.featureCompaniesDesc,
  },
  {
    icon: Briefcase,
    title: texts.featureJobsTitle,
    desc: texts.featureJobsDesc,
  },
  {
    icon: ShieldCheck,
    title: texts.featurePrivateTitle,
    desc: texts.featurePrivateDesc,
  },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-20">
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-2xl text-5xl font-semibold tracking-tight">
          {texts.appName}
        </h1>
        <p className="text-muted-foreground max-w-md text-lg">
          {texts.appTagline}
        </p>
        <Suspense>
          <Cta />
        </Suspense>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="text-muted-foreground size-5" />
              <CardTitle>{title}</CardTitle>
              <CardDescription>{desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>
    </main>
  );
}

async function Cta() {
  const session = await getSession();

  if (session) {
    return (
      <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
        {texts.ctaDashboard}
      </Link>
    );
  }

  return (
    <div className="flex gap-3">
      <Link
        href="/auth/sign-in"
        className={buttonVariants({ variant: "outline", size: "lg" })}
      >
        {texts.navSignIn}
      </Link>
      <Link href="/auth/sign-up" className={buttonVariants({ size: "lg" })}>
        {texts.navGetStarted}
      </Link>
    </div>
  );
}
