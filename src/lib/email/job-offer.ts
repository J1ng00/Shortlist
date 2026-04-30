import nodemailer from "nodemailer";

type JobOfferEmailArgs = {
  candidateEmail: string;
  candidateName: string;
  appliedPosition: string;
  companyName: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}. Configure SMTP settings before sending offer emails.`);
  }

  return value;
}

async function createTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    if (process.env.NODE_ENV === "production") {
      requiredEnv("SMTP_HOST");
      requiredEnv("SMTP_USER");
      requiredEnv("SMTP_PASS");
    }

    const testAccount = await nodemailer.createTestAccount();

    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  const smtpPort = Number(process.env.SMTP_PORT ?? 587);

  return nodemailer.createTransport({
    host: requiredEnv("SMTP_HOST"),
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: requiredEnv("SMTP_USER"),
      pass: requiredEnv("SMTP_PASS"),
    },
  });
}

export function buildJobOfferEmail(args: JobOfferEmailArgs) {
  const senderName = process.env.INTERVIEW_EMAIL_SENDER_NAME ?? "Hiring Team";
  const senderPosition = process.env.INTERVIEW_EMAIL_SENDER_POSITION ?? "Talent Acquisition";

  return `Dear ${args.candidateName},

Thank you for taking the time to speak with us about the ${args.appliedPosition} role with ${args.companyName}.

We are pleased to offer you the position of ${args.appliedPosition}. We were impressed by your experience, approach, and potential contribution to our team.

We would like to discuss the next steps with you, including the proposed start date, employment details, and any remaining onboarding information.

Please reply to this email to confirm your interest, and we will follow up with the formal offer documentation.

Congratulations, and we look forward to welcoming you to ${args.companyName}.

Kind regards,
${senderName}
${senderPosition}
${args.companyName}`;
}

export async function sendJobOfferEmail(args: JobOfferEmailArgs) {
  const fromEmail = process.env.INTERVIEW_EMAIL_FROM ?? process.env.SMTP_USER ?? "Shortlist Dev <no-reply@shortlist.local>";
  const transporter = await createTransporter();

  const info = await transporter.sendMail({
    from: fromEmail,
    to: args.candidateEmail,
    subject: `Offer for ${args.appliedPosition}`,
    text: buildJobOfferEmail(args),
  });

  return {
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}
