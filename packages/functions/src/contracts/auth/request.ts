import z from "zod";

export const ChangePasswordEventSchema = z.object({
  headers: z.object({
    authorization: z.string(),
  }),
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(1, "New password is required"),
  }),
});

export type ChangePasswordEvent = z.infer<typeof ChangePasswordEventSchema>;
