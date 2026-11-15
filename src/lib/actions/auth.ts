"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { RegisterSchema, LoginSchema, ResetPasswordSchema, ForgotPasswordSchema } from "@/lib/validations/auth";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendMail, appUrl } from "@/lib/mail";

export async function registerUser(values: z.infer<typeof RegisterSchema>) {
  const validatedFields = RegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: validatedFields.error.errors[0]?.message || "Invalid fields!" };
  }

  const { email, password, name } = validatedFields.data;
  const normalizedEmail = email.toLowerCase();

  const ip = clientIp(await headers());
  const limited = await rateLimit(`register-ip:${ip}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return { error: `Too many sign-ups from this network. Try again in ${Math.ceil(limited.retryAfterSec / 60)} min.` };
  }

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

  // The raw token goes ONLY to the user's inbox, never back to the browser.
  await sendMail({
    to: normalizedEmail,
    subject: "Confirm your LifeHub email",
    text: `Welcome to LifeHub.\n\nConfirm your email: ${appUrl()}/api/verify-email?token=${rawToken}\n\nThis link expires in 24 hours.`,
  });

  return { success: "Account created. You can sign in now." };
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
  const generic = { success: "If that email exists, a password reset link has been sent." };

  const ip = clientIp(await headers());
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`reset:${normalizedEmail}`, 3, 60 * 60 * 1000),
    rateLimit(`reset-ip:${ip}`, 10, 60 * 60 * 1000),
  ]);
  if (!byEmail.ok || !byIp.ok) return generic; // same answer: no signal to attackers

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.isActive || user.deletedAt) return generic;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  const identifier = `pwd-reset:${normalizedEmail}`;

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }), // invalidate older links
    prisma.verificationToken.create({ data: { identifier, token: tokenHash, expires } }),
  ]);

  // SECURITY: the raw token is only emailed. It used to be returned to the caller,
  // which let anyone reset anyone's password by just knowing their email address.
  await sendMail({
    to: normalizedEmail,
    subject: "Reset your LifeHub password",
    text: `Reset your password: ${appUrl()}/reset-password?token=${rawToken}\n\nThis link expires in 1 hour. If you did not ask for it, ignore this email.`,
  });

  return generic;
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
