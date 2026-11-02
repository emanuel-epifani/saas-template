"use client";

import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { texts } from "@/texts";

import { navGroups } from "./nav-items";

export function AppTopbar() {
  const pathname = usePathname();
  const section = pathname.startsWith("/account")
    ? texts.navAccount
    : navGroups
        .flatMap((g) => g.items)
        .find((item) => pathname.startsWith(item.href))?.label;

  return (
    <header className="bg-background/80 sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="my-auto data-vertical:h-4" />
      {section ? <span className="text-sm font-medium">{section}</span> : null}
    </header>
  );
}
