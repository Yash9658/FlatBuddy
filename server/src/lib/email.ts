import { env } from "../config/env.js";
import nodemailer from "nodemailer";

type VerificationEmailInput = {
  email: string;
  verificationUrl: string;
};

function isSmtpConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.EMAIL_FROM);
}

function isBrevoApiConfigured() {
  return Boolean(env.BREVO_API_KEY && env.EMAIL_FROM);
}

function parseEmailAddress(value: string) {
  const normalizedValue = value.trim().replace(/^["']|["']$/g, "");
  const match = normalizedValue.match(/^(.*)<(.+)>$/);

  if (!match) {
    return {
      email: normalizedValue,
      name: undefined,
    };
  }

  return {
    name: match[1]?.trim().replace(/^["']|["']$/g, "") || undefined,
    email: match[2]?.trim(),
  };
}

export async function sendVerificationEmail({ email, verificationUrl }: VerificationEmailInput) {
  if (!isBrevoApiConfigured() && !isSmtpConfigured()) {
    console.log(`Email verification link for ${email}: ${verificationUrl}`);
    return;
  }

  if (isBrevoApiConfigured()) {
    const sender = parseEmailAddress(env.EMAIL_FROM!);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": env.BREVO_API_KEY!,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email }],
        subject: "Verify your FlatBuddy email",
        htmlContent: `
          <p>Welcome to FlatBuddy.</p>
          <p>Verify your email to activate your account:</p>
          <p><a href="${verificationUrl}">Verify email</a></p>
          <p>This link expires in 1 hour.</p>
        `,
        textContent: `Verify your FlatBuddy email: ${verificationUrl}\n\nThis link expires in 1 hour.`,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Brevo email API failed: ${message || response.statusText}`);
    }

    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
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
