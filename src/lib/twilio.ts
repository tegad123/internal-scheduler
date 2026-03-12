import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

function getClient() {
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(accountSid, authToken);
}

export async function sendSMS(to: string, body: string) {
  const client = getClient();

  // Test mode: route all SMS to a single test phone number
  const testPhone = process.env.TEST_PHONE;
  const destination = testPhone
    ? testPhone.startsWith("+")
      ? testPhone
      : `+1${testPhone}`
    : to;

  const message = await client.messages.create({
    body,
    from: fromNumber,
    to: destination,
  });
  return message;
}

// ─── Helpers ─────────────────────────────────────────────

export function formatPatientAddress(referral: {
  patientAddress?: string | null;
  patientCity?: string | null;
  patientState?: string | null;
  patientZipCode: string;
}): string {
  const parts = [
    referral.patientAddress,
    referral.patientCity,
    referral.patientState,
    referral.patientZipCode,
  ].filter(Boolean);
  return parts.join(", ");
}

export function abbreviatePatientName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

// ─── Message Templates ──────────────────────────────────

interface OfferMessageData {
  clinicianFirstName: string;
  agencyName: string;
  discipline: string;
  patientAddress: string;
}

export function formatOfferMessage(data: OfferMessageData) {
  return `Hello ${data.clinicianFirstName}, ${data.agencyName} needs a ${data.discipline}-Eval & Treat to be done at ${data.patientAddress}. Evals w/in 48 hours. Pls confirm your availability: respond YES to accept, or NO to reject. Thank you.`;
}

interface AssignmentConfirmationData {
  patientNameAbbreviated: string;
  patientAddress: string;
  supportPhone: string;
}

export function formatAssignmentConfirmation(data: AssignmentConfirmationData) {
  return `You have successfully been assigned HCT Patient: ${data.patientNameAbbreviated} at ${data.patientAddress}. Therapist - you MUST contact schedule patient evaluation within 3 hours of this message. Eval MUST be completed within 48 hrs. Note must be submitted in EMR within 24 hours of visit. For issues, contact ${data.supportPhone} for scheduling assistance. Please complete COVID-19 screen before visiting. Thx, HCT.`;
}

interface FilledMessageData {
  clinicianFirstName: string;
  patientName: string;
}

export function formatFilledMessage(data: FilledMessageData) {
  return `Hi ${data.clinicianFirstName}, ${data.patientName} has already been assigned. Thank you for your response.`;
}

export function formatNoAcknowledgment() {
  return "Thank you for your response. We will keep you in mind for future opportunities.";
}
