import { Bookmark, Briefcase, Building2, LayoutDashboard } from "lucide-react";

import type { NavGroup } from "@/app/models";
import { texts } from "@/texts";

export const navGroups: readonly NavGroup[] = [
  {
    label: texts.navGroupGeneral,
    items: [
      { href: "/dashboard", label: texts.navDashboard, icon: LayoutDashboard },
    ],
  },
  {
    label: texts.navGroupProspecting,
    items: [
      {
        href: "/companies",
        label: texts.navCompanies,
        icon: Building2,
        tone: "companies",
      },
      {
        href: "/job-offers",
        label: texts.navJobOffers,
        icon: Briefcase,
        tone: "jobs",
      },
    ],
  },
  {
    label: texts.navGroupWork,
    items: [
      { href: "/saved", label: texts.navSaved, icon: Bookmark, soon: true },
    ],
  },
];
