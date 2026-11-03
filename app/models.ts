import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

export interface SearchBarProps {
  idPrefix: string;
  term: string;
  onTermChange: (v: string) => void;
  termLabel: string;
  termPlaceholder: string;
  city: string;
  onCityChange: (v: string) => void;
  radius?: {
    value: number;
    onChange: (km: number) => void;
    options: readonly { km: number; label: string }[];
  };
  pending?: boolean;
  onSubmit: () => void;
}
