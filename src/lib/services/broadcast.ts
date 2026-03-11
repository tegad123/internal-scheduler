import { prisma } from "../db";
import { sendSMS, formatOfferMessage, formatPatientAddress } from "../twilio";

interface BroadcastResult {
  totalOffers: number;
  sentCount: number;
  failedCount: number;
  errors: Array<{ clinicianId: string; error: string }>;
}

export async function broadcastOffers(
  referralId: string,
  clinicianIds: string[]
): Promise<BroadcastResult> {
  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    include: { agency: true },
  });

  if (!referral) throw new Error("Referral not found");
  if (clinicianIds.length === 0) throw new Error("No clinicians to broadcast to");

  // Create all offer records
  const offers = await prisma.$transaction(async (tx) => {
    // Update referral status
    await tx.referral.update({
      where: { id: referralId },
      data: { status: "OFFER_SENT" },
    });

    // Create offer records
    const created = await Promise.all(
      clinicianIds.map((clinicianId) =>
        tx.broadcastOffer.create({
          data: {
            referralId,
            clinicianId,
            status: "PENDING",
          },
          include: { clinician: true },
        })
      )
    );

    return created;
  });

  // Send SMS to each clinician
  const result: BroadcastResult = {
    totalOffers: offers.length,
    sentCount: 0,
    failedCount: 0,
    errors: [],
  };

  const patientAddress = formatPatientAddress(referral);

  await Promise.allSettled(
    offers.map(async (offer) => {
      try {
        const message = formatOfferMessage({
          clinicianFirstName: offer.clinician.firstName,
          agencyName: referral.agency.name,
          discipline: referral.discipline,
          patientAddress,
        });
        const smsResult = await sendSMS(offer.clinician.phone, message);

        await prisma.broadcastOffer.update({
          where: { id: offer.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            twilioSid: smsResult.sid,
          },
        });

        // Log the communication
        await prisma.communicationLog.create({
          data: {
            phone: offer.clinician.phone,
            message,
            direction: "OUTBOUND",
            twilioSid: smsResult.sid,
            referralId,
            clinicianId: offer.clinicianId,
          },
        });

        result.sentCount++;
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          clinicianId: offer.clinicianId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })
  );

  return result;
}
