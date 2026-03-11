import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials not configured");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(params: SendEmailParams) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || "noreply@hctscheduler.com";

  return transporter.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

interface AssignmentEmailData {
  clinicianName: string;
  patientName: string;
  patientAddress: string;
}

export function formatAssignmentEmail(data: AssignmentEmailData) {
  return {
    subject: `Case Assignment: ${data.clinicianName} assigned to ${data.patientName}`,
    text: `${data.clinicianName} has been assigned to ${data.patientName} at ${data.patientAddress}. Please update the portal.`,
  };
}
