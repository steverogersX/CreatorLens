import { z } from "zod";


export const TranscriptSegmentSchema = z.object({
  id: z.number(),
  start: z.number(),
  end: z.number(),
  text: z.string(),
  confidence: z.number().min(0).max(1),
});

export const TranscriptSchema = z.object({
  provider: z.string(),
  language: z.string(),
  text: z.string(),
  duration: z.number(),
  segments: z.array(TranscriptSegmentSchema),
  createdAt: z.date(),
});

export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;
export type ITranscript = z.infer<typeof TranscriptSchema>;
