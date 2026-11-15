/**
 * Minimal transactional mail sender (Resend HTTP API, no extra dependency).
 *
 *   RESEND_API_KEY=...      MAIL_FROM="LifeHub <no-reply@yourdomain.com>"
 *
 * Without configuration the message is printed to the SERVER log in development only.
 * Secrets (reset / verification links) are never returned to the browser.
 */
export function appUrl(): string {
  return (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendMail(opts: { to: string; subject: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!key || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[mail:dev] To: ${opts.to}\nSubject: ${opts.subject}\n${opts.text}\n`);
    } else {
      console.warn("[mail] RESEND_API_KEY / MAIL_FROM not set; email not sent");
    }
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, text: opts.text }),
    });
    if (!res.ok) {
      console.error("[mail] send failed", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mail] send error", err);
    return false;
  }
}
