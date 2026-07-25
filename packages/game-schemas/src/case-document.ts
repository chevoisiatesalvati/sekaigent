import { z } from "zod";

export const CaseDocumentKindSchema = z.enum([
  "clipping",
  "cable",
  "witness",
  "ledger",
  "rumor",
  "photo_note",
]);

export const CaseDocumentSchema = z.object({
  id: z.string().min(1),
  kind: CaseDocumentKindSchema,
  title: z.string().min(1),
  body: z.string().min(1),
});

export type CaseDocumentKind = z.infer<typeof CaseDocumentKindSchema>;
export type CaseDocument = z.infer<typeof CaseDocumentSchema>;
