import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentEditor } from "@/components/DocumentEditor";
import { Header } from "@/components/Header";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentForUser } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import type { DocumentDetail } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Returns null for both "missing" and "no access" so the page cannot reveal which one it is. */
async function loadDocument(id: string, userId: string): Promise<DocumentDetail | null> {
  try {
    return await getDocumentForUser(id, userId);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const doc = await loadDocument(id, user.id);

  return (
    <>
      <Header user={user} />
      {doc ? <DocumentEditor key={doc.id} doc={doc} /> : <DocumentNotFound />}
    </>
  );
}

function DocumentNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Document not found or you don&apos;t have access</h1>
      <p className="mt-2 text-slate-600">
        The link may be wrong, the document may have been deleted, or it has not been shared with
        you.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        Back to documents
      </Link>
    </main>
  );
}
