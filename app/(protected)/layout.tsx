import type { ReactNode } from "react";
import { Suspense } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireUser } from "@/lib/auth/session";

import { AppSidebar } from "./components/app-sidebar";
import { AppSidebarSkeleton } from "./components/app-sidebar-skeleton";
import { AppTopbar } from "./components/app-topbar";

// Guard for every route inside (protected): one requireUser() for the whole
// segment instead of repeating it in each page. It runs on entry into the
// segment and on every router.refresh() (e.g. after sign-in/sign-out).
//
// The session read must NOT sit at the layout's top level: with
// cacheComponents it would hold the whole segment's prerendering. It lives
// in a component inside <Suspense>, evaluated when the page streams in.
// Authoritative checks in Server Actions still verify the session
// themselves — this guard is not a substitute for that.
export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      {/* usePathname() inside the sidebar/topbar is a runtime hook: under
          cacheComponents it can't prerender, so each sits in <Suspense> and
          streams in like the guarded page content below. */}
      <Suspense fallback={<AppSidebarSkeleton />}>
        <AppSidebar />
      </Suspense>
      {/* min-w-0: without it the flex item refuses to shrink below the
          widest child's intrinsic width — a wide table would stretch the
          whole inset and scroll the PAGE instead of its own container. */}
      <SidebarInset className="min-w-0">
        <Suspense>
          <AppTopbar />
        </Suspense>
        <Suspense>
          <SessionGuard>{children}</SessionGuard>
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}

async function SessionGuard({ children }: { children: ReactNode }) {
  await requireUser();
  return children;
}
