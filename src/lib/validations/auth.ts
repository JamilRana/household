import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email({
    message: "Valid email is required",
  }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .max(72, { message: "Password cannot exceed 72 bytes" }),
  code: z.string().optional(),
});

export const RegisterSchema = z.object({
  email: z.string().email({
    message: "Valid email is required",
  }),
  password: z
    .string()
    .min(10, {
      message: "Minimum 10 characters required",
    })
    .max(72, {
      message: "Password cannot exceed 72 bytes (bcrypt limitation)",
    }),
  name: z.string().min(1, {
    message: "Name is required",
  }),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(10, "New password must be at least 10 characters")
    .max(72, "Password cannot exceed 72 bytes"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(10, "New password must be at least 10 characters")
    .max(72, "Password cannot exceed 72 bytes"),
});
