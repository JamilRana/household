import Link from "next/link";
import { ResetPasswordForm } from "./reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">This link is not valid</h1>
        <p className="text-sm text-muted-foreground">
          The reset link is missing or incomplete. Ask for a new one and open it from your email.
        </p>
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline underline-offset-4">
          Send a new link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
