import { z } from "zod";

/** Buyers self-serve; ADMIN is never assignable through public registration. */
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.email("Enter a valid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{8,16}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  role: z.enum(["BUYER", "OWNER", "AGENT"]).default("BUYER"),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
