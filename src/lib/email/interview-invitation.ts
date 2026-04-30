import nodemailer from "nodemailer";

const INTERVIEW_LINK =
  "https://wolf-policy-baggage.ngrok-free.dev/interview/82a7422b-26e4-4ec6-93cc-efabfcc9dd4e/live?role=candidate";

type InterviewInvitationArgs = {
  candidateEmail: string;
  candidateName: string;
  appliedPosition: string;
  companyName: string;
  interviewDate: string;
  interviewTime: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}. Configure SMTP settings before sending interview emails.`);
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

function buildInterviewInvitationEmail(args: InterviewInvitationArgs) {
  const senderName = process.env.INTERVIEW_EMAIL_SENDER_NAME ?? "Hiring Team";
  const senderPosition = process.env.INTERVIEW_EMAIL_SENDER_POSITION ?? "Talent Acquisition";

  return `Dear ${args.candidateName},

Thank you for your interest in the ${args.appliedPosition} with ${args.companyName}.

We were impressed with your background and would like to invite you to attend an interview with our team. This will be an opportunity for us to learn more about your experience and for you to better understand the role and how you can contribute.

The interview will cover your experience, skills, and alignment with our company values.

Interview Details: ${args.interviewDate} ${args.interviewTime}
Interview Link: ${INTERVIEW_LINK}

If you require any additional information prior to the interview, please feel free to reach out. You can contact us via email or at 0400 000 000.

We look forward to speaking with you.

Kind regards,
${senderName}
${senderPosition}
${args.companyName}`;
}

export async function sendInterviewInvitation(args: InterviewInvitationArgs) {
  const fromEmail = process.env.INTERVIEW_EMAIL_FROM ?? process.env.SMTP_USER ?? "Shortlist Dev <no-reply@shortlist.local>";
  const transporter = await createTransporter();

  const info = await transporter.sendMail({
    from: fromEmail,
    to: args.candidateEmail,
    subject: `Interview invitation for ${args.appliedPosition}`,
    text: buildInterviewInvitationEmail(args),
  });

  return {
    previewUrl: nodemailer.getTestMessageUrl(info) || null,
  };
}
