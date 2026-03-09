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
  const message = await client.messages.create({
    body,
    from: fromNumber,
    to,
  });
  return message;
}

export function formatOfferMessage(
  discipline: string,
  zipCode: string,
  caseId: string
) {
  return `HCT Case Offer: ${discipline} in ${zipCode}. Reply YES to accept or NO to decline. Case #${caseId}`;
}

export function formatAssignmentConfirmation(
  discipline: string,
  zipCode: string
) {
  return `You have been assigned the ${discipline} case in ${zipCode}. Our team will follow up with details shortly.`;
}

export function formatFilledMessage() {
  return "Thank you, this spot has already been filled.";
}

export function formatNoAcknowledgment() {
  return "Thank you for your response. We will keep you in mind for future opportunities.";
}
