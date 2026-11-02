import { Building2 } from "lucide-react";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { texts } from "@/texts";

import { SearchSection } from "./components/search-section";

export default function CompaniesPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        icon={Building2}
        title={texts.companiesTitle}
        description={texts.companiesSubtitle}
        tone="companies"
      />
      <Suspense>
        <SearchSection />
      </Suspense>
    </main>
  );
}
