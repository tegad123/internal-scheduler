import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleYesResponse, handleNoResponse } from "@/lib/services/assignment";

function normalizePhone(phone: string): string {
  // Strip everything except digits and leading +
  const digits = phone.replace(/[^\d+]/g, "");
  // Ensure +1 prefix for US numbers
  if (digits.startsWith("+1")) return digits;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return digits;
}

export async function POST(request: Request) {
  try {
    // Twilio sends form-encoded data
    const formData = await request.formData();
    const body = formData.get("Body") as string | null;
    const from = formData.get("From") as string | null;

    if (!body || !from) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response/>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    const normalizedPhone = normalizePhone(from);
    const messageText = body.trim().toUpperCase();

    // Look up clinician by phone
    const clinician = await prisma.clinician.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: from },
        ],
      },
    });

    // Log the inbound message
    await prisma.communicationLog.create({
      data: {
        phone: normalizedPhone,
        message: body.trim(),
        direction: "INBOUND",
        clinicianId: clinician?.id,
      },
    });

    if (!clinician) {
      // Unknown sender - return empty TwiML
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response/>',
        {
          status: 200,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    // Parse response
    if (messageText.includes("YES")) {
      await handleYesResponse(clinician.id, normalizedPhone);
    } else if (messageText.includes("NO")) {
      await handleNoResponse(clinician.id, normalizedPhone);
    }

    // Return empty TwiML response
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response/>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("Twilio webhook error:", error);
    // Always return valid TwiML even on error
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response/>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
}
