/**
 * Vercel Serverless API Route: Send 6-digit Email Verification Code
 *
 * Expects body: { email: string, code: string }
 *
 * Required environment variables (choose one provider):
 *
 * Option A — Resend (recommended, simple):
 *   RESEND_API_KEY   — get from https://resend.com
 *   EMAIL_FROM       — e.g. "Stado <noreply@yourdomain.com>"
 *
 * Option B — SMTP (e.g. Gmail, SendGrid, Mailgun SMTP):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   EMAIL_FROM
 *
 * This file auto-detects which provider to use based on which env vars are set.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ success: false, error: "Missing email or code" });
  }

  const from = process.env.EMAIL_FROM || "Stado <noreply@stado-eight.vercel.app>";

  const subject = "Your Stado verification code";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #F1EFE8; border-radius: 16px;">
      <h1 style="font-size: 28px; font-weight: 700; color: #085041; letter-spacing: -0.5px; margin: 0 0 8px;">stado</h1>
      <p style="font-size: 15px; color: #7A7A72; margin: 0 0 32px;">Find your game. Show up and play.</p>

      <div style="background: white; border-radius: 14px; padding: 32px 24px; text-align: center; border: 1.5px solid #E0DDD5;">
        <p style="font-size: 15px; color: #555550; margin: 0 0 20px;">Your verification code is:</p>
        <div style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #085041; font-variant-numeric: tabular-nums;">${code}</div>
        <p style="font-size: 13px; color: #7A7A72; margin: 20px 0 0;">This code expires in <strong>10 minutes</strong>.</p>
      </div>

      <p style="font-size: 13px; color: #A8A59D; text-align: center; margin: 24px 0 0; line-height: 1.5;">
        If you didn't create a Stado account, you can safely ignore this email.
      </p>
    </div>
  `;
  const text = `Your Stado verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't create a Stado account, you can safely ignore this email.`;

  try {
    // ── Option A: Resend ────────────────────────────────────────────────────
    if (process.env.RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({ from, to: [email], subject, html, text }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Resend error:", data);
        return res.status(500).json({ success: false, error: "Failed to send email" });
      }

      return res.status(200).json({ success: true });
    }

    // ── Option B: SMTP via nodemailer ───────────────────────────────────────
    if (process.env.SMTP_HOST) {
      // Dynamically import nodemailer (available in Node.js serverless env)
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({ from, to: email, subject, html, text });
      return res.status(200).json({ success: true });
    }

    // ── No provider configured ──────────────────────────────────────────────
    console.error("No email provider configured. Set RESEND_API_KEY or SMTP_HOST.");
    return res.status(500).json({ success: false, error: "Email provider not configured" });

  } catch (err) {
    console.error("sendVerificationCode error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}