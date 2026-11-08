import {
  Archive,
  Briefcase,
  Building2,
  Landmark,
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
        href: "/companies",
        label: texts.navSearchCompanies,
        icon: Building2,
      },
      {
        href: "/job-offers",
        label: texts.navSearchJobs,
        icon: Briefcase,
      },
      {
        href: "/companies-openapi",
        label: texts.navRegistryCompanies,
        icon: Landmark,
      },
      {
        href: "/companies-google",
        label: texts.navPlacesCompanies,
        icon: MapPin,
      },
    ],
  },
  {
    label: texts.navGroupArchive,
    items: [{ href: "/saved", label: texts.navSaved, icon: Archive }],
  },
];
