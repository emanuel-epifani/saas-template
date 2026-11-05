import { Suspense } from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { isOpenApiSandbox } from "@/lib/companies/openapi";
import { texts } from "@/texts";

import { SearchSection } from "./components/search-section";

export default function CompaniesOpenApiPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <PageHeader
          title={texts.openapiCompaniesTitle}
          description={texts.openapiCompaniesSubtitle}
        />
        {isOpenApiSandbox() ? (
          <Badge variant="secondary" className="self-start uppercase">
            {texts.openapiSandboxBadge}
          </Badge>
        ) : null}
      </div>
      <Suspense>
        <SearchSection />
      </Suspense>
    </main>
  );
}
