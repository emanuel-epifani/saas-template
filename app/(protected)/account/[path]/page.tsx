import { AccountView } from "@daveyplate/better-auth-ui";
import { Suspense } from "react";

// Account settings (profile, security, sessions). Guarded twice:
// optimistically by proxy.ts (cookie check), authoritatively by the
// (protected) layout's requireUser().
export default function AccountPage({ params }: PageProps<"/account/[path]">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4">
      <Suspense>
        <AccountSection params={params} />
      </Suspense>
    </main>
  );
}

// params is runtime data: with cacheComponents it must be read inside a
// <Suspense> boundary or prerendering is blocked.
async function AccountSection({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  return <AccountView path={path} />;
}
