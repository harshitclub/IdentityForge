import z from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN"]),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]),
});
