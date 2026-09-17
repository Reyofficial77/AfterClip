import { z } from "zod";

export const createReviewSchema = z.object({
  clipUrl: z.string().min(1, "Clip URL is required"),
  clipTitle: z.string().min(1, "Clip title is required").max(200),
  clipGoal: z.string().min(1, "Tell AfterClip what this clip should achieve").max(500),
  referenceUrl: z.string().optional().nullable(),
});

export const reviseReviewSchema = z.object({
  clipUrl: z.string().min(1, "Clip URL is required"),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
});
