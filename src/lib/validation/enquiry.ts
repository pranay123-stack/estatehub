import { z } from "zod";

export const enquirySchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().trim().min(2, "Name is required").max(80),
  email: z.email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{8,16}$/, "Enter a valid phone number"),
  message: z.string().trim().min(10, "Tell the seller what you'd like to know").max(1000),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
