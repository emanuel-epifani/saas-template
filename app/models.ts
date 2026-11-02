import type { LucideIcon } from "lucide-react";

export type NavTone = "primary" | "companies" | "jobs";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  tone?: NavTone;
  soon?: boolean;
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}
