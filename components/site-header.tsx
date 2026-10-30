"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { texts } from "@/texts";

const links = [
  { href: "/companies", label: texts.navCompanies },
  { href: "/job-offers", label: texts.navJobOffers },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <nav className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold">
          {texts.appName}
        </Link>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={
              pathname.startsWith(href)
                ? "text-foreground text-sm font-medium"
                : "text-muted-foreground hover:text-foreground text-sm"
            }
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
