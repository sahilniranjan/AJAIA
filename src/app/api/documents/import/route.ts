import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDocument } from "@/lib/documents";
import { AppError, handle, validationError } from "@/lib/errors";
import { MAX_IMPORT_BYTES, checkImportFileMeta, convertFileToDocument, validateImportFile } from "@/lib/import";

// Multipart boundaries and headers add a little overhead on top of the file itself.
const MAX_REQUEST_BYTES = MAX_IMPORT_BYTES + 64 * 1024;

// happy-dom (used by the markdown converter) needs the Node runtime, not Edge.
export const runtime = "nodejs";

export const POST = handle(async (request: Request) => {
  const user = await requireUser();

  // Reject obviously oversized uploads from the header before buffering the body.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "File is too large. The limit is 1 MB.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw validationError("Upload a file using a multipart form.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) throw validationError("Choose a file to import.");

  // Check name and size before reading the bytes into memory as text.
  checkImportFileMeta({ name: file.name, size: file.size });
  const text = validateImportFile({
    name: file.name,
    size: file.size,
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  const { title, content } = convertFileToDocument(file.name, text);

  const doc = await createDocument(user.id, { title, content });
  return NextResponse.json(
    { id: doc.id, title: doc.title, updatedAt: doc.updatedAt.toISOString() },
    { status: 201 },
  );
});
