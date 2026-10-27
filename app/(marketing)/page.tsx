import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { texts } from "@/texts";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">{texts.appName}</h1>
      <p className="text-muted-foreground max-w-md">{texts.appTagline}</p>
      <div className="flex gap-3">
        <Link href="/auth/sign-in" className={buttonVariants()}>
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className={buttonVariants({ variant: "outline" })}
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
