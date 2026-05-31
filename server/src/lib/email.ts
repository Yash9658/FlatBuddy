import { env } from "../config/env.js";
import nodemailer from "nodemailer";

type VerificationEmailInput = {
  email: string;
  verificationUrl: string;
};

function isSmtpConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
}

export async function sendVerificationEmail({ email, verificationUrl }: VerificationEmailInput) {
  if (!isSmtpConfigured()) {
    console.log(`Email verification link for ${email}: ${verificationUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Verify your FlatBuddy email",
    html: `
        <p>Welcome to FlatBuddy.</p>
        <p>Verify your email to activate your account:</p>
        <p><a href="${verificationUrl}">Verify email</a></p>
        <p>This link expires in 1 hour.</p>
      `,
    text: `Verify your FlatBuddy email: ${verificationUrl}\n\nThis link expires in 1 hour.`,
  });
}
