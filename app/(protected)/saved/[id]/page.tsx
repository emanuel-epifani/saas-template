import { notFound } from "next/navigation";
import { Suspense } from "react";

import { requireUser } from "@/lib/auth/session";
import {
  findCompanyItems,
  findJobItems,
  findListForUser,
} from "@/lib/db/queries";

import { ListDetail } from "./components/list-detail";

export default function SavedListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <Suspense>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const list = await findListForUser(id, user.id);
  if (!list) notFound();

  if (list.kind === "company") {
    const items = await findCompanyItems(list.id);
    return <ListDetail list={list} kind="company" items={items} />;
  }
  const items = await findJobItems(list.id);
  return <ListDetail list={list} kind="job" items={items} />;
}
