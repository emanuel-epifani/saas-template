import {
  Archive,
  Briefcase,
  LayoutDashboard,
  MapPin,
} from "lucide-react";

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
        href: "/companies-google",
        label: texts.navSearchCompanies,
        icon: MapPin,
      },
      {
        href: "/job-offers",
        label: texts.navSearchJobs,
        icon: Briefcase,
      },
    ],
  },
  {
    label: texts.navGroupArchive,
    items: [{ href: "/saved", label: texts.navSaved, icon: Archive }],
  },
];
