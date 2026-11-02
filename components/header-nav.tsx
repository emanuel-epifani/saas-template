"use client";

import { UserButton } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { texts } from "@/texts";

const links = [
  { href: "/dashboard", label: texts.navDashboard },
  { href: "/companies", label: texts.navCompanies },
  { href: "/job-offers", label: texts.navJobOffers },
] as const;

// Signed-in side of the header: nav links (active state needs usePathname,
// hence the client boundary) + the account menu.
export function HeaderNav() {
  const pathname = usePathname();

  return (
    <>
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
      <div className="ml-auto">
        <UserButton
          size="icon"
          align="end"
          classNames={{ trigger: { base: "cursor-pointer" } }}
        />
      </div>
    </>
  );
}
