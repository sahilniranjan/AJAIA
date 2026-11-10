import { z } from "zod";

export const DEFAULT_TITLE = "Untitled document";
export const MAX_TITLE_LENGTH = 200;
export const MAX_CONTENT_BYTES = 1_000_000;

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] } as const;

export const titleSchema = z
  .string()
  .trim()
  .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`)
  .transform((t) => (t === "" ? DEFAULT_TITLE : t));

export const contentSchema = z
  .looseObject(
    {
      type: z.literal("doc", { message: "Content must be a document." }),
      content: z.array(z.unknown()).optional(),
    },
    { message: "Content must be a document." },
  )
  .refine((c) => JSON.stringify(c).length <= MAX_CONTENT_BYTES, {
    message: "Document is too large to save (limit is about 1 MB).",
  });

export const createDocumentSchema = z.object({ title: titleSchema.optional() });

export const patchDocumentSchema = z
  .object({ title: titleSchema.optional(), content: contentSchema.optional() })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: "Nothing to update.",
  });

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  role: z.enum(["VIEWER", "EDITOR"], { message: "Role must be Viewer or Editor." }),
});

export const sessionSchema = z.object({ userId: z.string().min(1) });

/** Parses with zod and throws the first issue as a friendly message. */
export function parseOrThrow<T>(
  schema: z.ZodType<T>,
  value: unknown,
  onError: (message: string) => Error,
): T {
  const result = schema.safeParse(value);
  if (!result.success) throw onError(result.error.issues[0]?.message ?? "Invalid input.");
  return result.data;
}
