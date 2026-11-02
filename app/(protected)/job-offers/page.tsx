import { Briefcase } from "lucide-react";
import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { texts } from "@/texts";

import { SearchSection } from "./components/search-section";

export default function JobOffersPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader
        icon={Briefcase}
        title={texts.jobOffersTitle}
        description={texts.jobOffersSubtitle}
        tone="jobs"
      />
      <Suspense>
        <SearchSection />
      </Suspense>
    </main>
  );
}
