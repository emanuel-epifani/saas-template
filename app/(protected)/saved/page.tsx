import { Archive, Briefcase, Building2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { texts } from "@/texts";

export default function SavedPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <PageHeader title={texts.savedTitle} description={texts.savedSubtitle} />
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Archive />
          </EmptyMedia>
          <EmptyTitle>{texts.savedEmptyTitle}</EmptyTitle>
          <EmptyDescription>{texts.savedEmptyDesc}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex gap-2">
            <Link
              href="/companies"
              className={buttonVariants({ variant: "outline" })}
            >
              <Building2 />
              {texts.navCompanies}
            </Link>
            <Link
              href="/job-offers"
              className={buttonVariants({ variant: "outline" })}
            >
              <Briefcase />
              {texts.navJobOffers}
            </Link>
          </div>
        </EmptyContent>
      </Empty>
    </main>
  );
}
