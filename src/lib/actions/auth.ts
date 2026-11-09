"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { RegisterSchema, LoginSchema, ResetPasswordSchema, ForgotPasswordSchema } from "@/lib/validations/auth";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function registerUser(values: z.infer<typeof RegisterSchema>) {
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: validatedFields.error.errors[0]?.message || "Invalid fields!" };
  }

  const { email, password, name } = validatedFields.data;
  const normalizedEmail = email.toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 12);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return { error: "Email already in use!" };
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: hashedPassword,
    },
  });

  // Generate email verification token (SHA-256 hashed in database)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token: tokenHash,
      expires,
    },
  });

  return { success: "Account created! Please verify your email.", rawVerificationToken: rawToken };
}

export async function loginUser(values: z.infer<typeof LoginSchema>) {
  const validatedFields = LoginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields!" };
  }

  const { email, password } = validatedFields.data;

  try {
    await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials or inactive account!" };
        default:
          return { error: "Something went wrong during sign-in!" };
      }
    }

    throw error;
  }
}

export async function requestPasswordReset(values: z.infer<typeof ForgotPasswordSchema>) {
  const validated = ForgotPasswordSchema.safeParse(values);
  if (!validated.success) return { error: "Invalid email" };

  const normalizedEmail = validated.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Prevent email enumeration by returning success regardless
  if (!user) {
    return { success: "If that email exists, a password reset link has been dispatched." };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.verificationToken.create({
    data: {
      identifier: `pwd-reset:${normalizedEmail}`,
      token: tokenHash,
      expires,
    },
  });

  return { success: "If that email exists, a password reset link has been dispatched.", rawToken };
}

export async function resetPasswordWithToken(values: z.infer<typeof ResetPasswordSchema>) {
  const validated = ResetPasswordSchema.safeParse(values);
  if (!validated.success) return { error: "Invalid fields" };

  const tokenHash = crypto.createHash("sha256").update(validated.data.token).digest("hex");

  const record = await prisma.verificationToken.findUnique({
    where: { token: tokenHash },
  });

  if (!record || record.expires < new Date() || !record.identifier.startsWith("pwd-reset:")) {
    return { error: "Invalid or expired password reset link" };
  }

  const email = record.identifier.replace("pwd-reset:", "");
  const hashedPassword = await bcrypt.hash(validated.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        sessionVersion: { increment: 1 }, // Revoke all existing sessions
      },
    }),
    prisma.verificationToken.delete({
      where: { token: tokenHash },
    }),
  ]);

  return { success: "Password successfully reset! Please sign in with your new password." };
}
