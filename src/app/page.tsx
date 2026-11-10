import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listDocumentsForUser } from "@/lib/documents";
import { Header } from "@/components/Header";
import { DocumentList } from "@/components/DocumentList";
import { NewDocumentButton } from "@/components/NewDocumentButton";
import { ImportButton } from "@/components/ImportButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocumentsForUser(user.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Your documents</h1>
          <div className="flex flex-wrap items-start gap-3">
            <NewDocumentButton />
            <ImportButton />
          </div>
        </div>

        <section aria-labelledby="owned-heading" className="mt-8">
          <h2 id="owned-heading" className="mb-3 text-lg font-semibold text-slate-900">
            Owned by me
          </h2>
          <DocumentList
            kind="owned"
            items={owned}
            emptyMessage="You haven't created any documents yet. Start a new one or import a file."
          />
        </section>

        <section aria-labelledby="shared-heading" className="mt-8">
          <h2 id="shared-heading" className="mb-3 text-lg font-semibold text-slate-900">
            Shared with me
          </h2>
          <DocumentList
            kind="shared"
            items={shared}
            emptyMessage="Nothing has been shared with you yet. Documents others share with you will show up here."
          />
        </section>
      </main>
    </div>
  );
}
