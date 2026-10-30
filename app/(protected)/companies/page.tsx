import { texts } from "@/texts";

import { SearchSection } from "./components/search-section";

export default function CompaniesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">{texts.companiesTitle}</h1>
      <SearchSection />
    </main>
  );
}
