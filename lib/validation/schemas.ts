import { z } from "zod";

export const missionSubmitSchema = z
  .object({
    workDescription: z.string(),
    hasFile: z.boolean(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    const code = data.workDescription.trim();
    if (!code && !data.hasFile) {
      ctx.addIssue({
        code: "custom",
        message: "Add code or upload a file",
        path: ["workDescription"],
      });
      return;
    }
    if (code && !data.hasFile && code.length < 10) {
      ctx.addIssue({
        code: "custom",
        message: "Code must be at least 10 characters",
        path: ["workDescription"],
      });
    }
    if (data.hasFile) {
      const name = data.fileName?.toLowerCase() ?? "";
      if (!name.endsWith(".stl")) {
        ctx.addIssue({
          code: "custom",
          message: "Only .stl files are allowed",
          path: ["file"],
        });
      }
      const maxBytes = 50 * 1024 * 1024;
      if ((data.fileSize ?? 0) > maxBytes) {
        ctx.addIssue({
          code: "custom",
          message: "File must be under 50 MB",
          path: ["file"],
        });
      }
    }
  });

export const parentContactSchema = z.object({
  parentName: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  whatsappNumber: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Use international format e.g. +919876543210"),
});

export const reviewApproveSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().optional(),
});

export const reviewRejectSchema = z.object({
  feedback: z.string().min(10, "Feedback must be at least 10 characters"),
});

export const challengeSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  deadline: z.string().refine((d) => new Date(d) > new Date(), {
    message: "Deadline must be in the future",
  }),
  xpReward: z.number().min(10).max(500),
});

export const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});
