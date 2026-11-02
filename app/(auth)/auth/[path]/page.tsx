import Link from "next/link";
import { Suspense } from "react";

import { BrandMark } from "@/components/brand-mark";
import { texts } from "@/texts";

import { AuthViewWithReset } from "./auth-view-with-reset";

// One catch-all route renders every auth screen. The route map is owned by
// better-auth-ui (authViewPaths in its src/lib/view-paths.ts); with this
// config the active paths are: sign-in, sign-up, sign-out, forgot-password,
// reset-password, email-verification. Others (magic-link, two-factor, ...)
// activate automatically if you enable the matching Better Auth feature.
export default function AuthPage({ params }: PageProps<"/auth/[path]">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <BrandMark />
        {texts.appName}
      </Link>
      <Suspense>
        <AuthViewFromParams params={params} />
      </Suspense>
    </main>
  );
}

// params is runtime data: with cacheComponents it must be read inside a
// <Suspense> boundary or prerendering is blocked.
async function AuthViewFromParams({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return <AuthViewWithReset path={path} />;
}
