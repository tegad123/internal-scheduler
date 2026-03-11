import { prisma } from "../db";
import {
  sendSMS,
  formatAssignmentConfirmation,
  formatFilledMessage,
  formatNoAcknowledgment,
  formatPatientAddress,
  abbreviatePatientName,
} from "../twilio";
import { sendEmail, formatAssignmentEmail } from "../email";

interface ClaimResult {
  success: boolean;
  alreadyFilled: boolean;
  assignmentId?: string;
}

/**
 * Attempt to claim a referral for a clinician. Uses SELECT FOR UPDATE
 * to ensure only one clinician can win the case even with concurrent requests.
 */
export async function claimReferral(
  offerId: string,
  clinicianId: string
): Promise<ClaimResult> {
  return await prisma.$transaction(async (tx) => {
    // Get the offer with its referral, locking the referral row
    const offer = await tx.broadcastOffer.findUnique({
      where: { id: offerId },
      include: { referral: true, clinician: true },
    });

    if (!offer) {
      return { success: false, alreadyFilled: false };
    }

    // Lock the referral row and check status atomically
    const [referral] = await tx.$queryRawUnsafe<
      Array<{ id: string; status: string }>
    >(
      `SELECT id, status FROM referrals WHERE id = $1 AND status = 'OFFER_SENT' FOR UPDATE`,
      offer.referralId
    );

    if (!referral) {
      // Already assigned or status changed
      await tx.broadcastOffer.update({
        where: { id: offerId },
        data: { status: "LOST_FILLED", respondedAt: new Date() },
      });

      return { success: false, alreadyFilled: true };
    }

    // This clinician wins - update everything atomically
    await tx.referral.update({
      where: { id: offer.referralId },
      data: { status: "ASSIGNED" },
    });

    await tx.broadcastOffer.update({
      where: { id: offerId },
      data: { status: "WON", respondedAt: new Date() },
    });

    // Mark all other offers as LOST_FILLED
    await tx.broadcastOffer.updateMany({
      where: {
        referralId: offer.referralId,
        id: { not: offerId },
        status: { in: ["SENT", "PENDING"] },
      },
      data: { status: "LOST_FILLED" },
    });

    // Create assignment
    const assignment = await tx.assignment.create({
      data: {
        referralId: offer.referralId,
        clinicianId,
      },
    });

    return {
      success: true,
      alreadyFilled: false,
      assignmentId: assignment.id,
    };
  });
}

/**
 * Handle an inbound YES response from a clinician.
 */
export async function handleYesResponse(
  clinicianId: string,
  phone: string
) {
  // Find the most recent SENT offer for this clinician
  const offer = await prisma.broadcastOffer.findFirst({
    where: {
      clinicianId,
      status: "SENT",
    },
    orderBy: { sentAt: "desc" },
    include: {
      referral: { include: { agency: true } },
      clinician: true,
    },
  });

  if (!offer) {
    return { handled: false, reason: "No pending offer found" };
  }

  const result = await claimReferral(offer.id, clinicianId);
  const patientAddress = formatPatientAddress(offer.referral);

  if (result.success) {
    // Send confirmation to winner
    const supportPhone = process.env.SUPPORT_PHONE || "";
    const confirmMsg = formatAssignmentConfirmation({
      patientNameAbbreviated: abbreviatePatientName(offer.referral.patientName),
      patientAddress,
      supportPhone,
    });
    try {
      const sms = await sendSMS(phone, confirmMsg);
      await prisma.communicationLog.create({
        data: {
          phone,
          message: confirmMsg,
          direction: "OUTBOUND",
          twilioSid: sms.sid,
          referralId: offer.referralId,
          clinicianId,
        },
      });
    } catch {
      // Log failure but don't roll back assignment
    }

    // Send admin email notification
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const clinicianName = `${offer.clinician.firstName} ${offer.clinician.lastName}`;
        const emailData = formatAssignmentEmail({
          clinicianName,
          patientName: offer.referral.patientName,
          patientAddress,
        });
        await sendEmail({
          to: adminEmail,
          subject: emailData.subject,
          text: emailData.text,
        });
      }
    } catch {
      // Email failure should not affect the assignment
    }
  } else if (result.alreadyFilled) {
    // Send "filled" message
    const filledMsg = formatFilledMessage({
      clinicianFirstName: offer.clinician.firstName,
      patientName: offer.referral.patientName,
    });
    try {
      const sms = await sendSMS(phone, filledMsg);
      await prisma.communicationLog.create({
        data: {
          phone,
          message: filledMsg,
          direction: "OUTBOUND",
          twilioSid: sms.sid,
          referralId: offer.referralId,
          clinicianId,
        },
      });
    } catch {
      // Log failure
    }
  }

  return {
    handled: true,
    won: result.success,
    alreadyFilled: result.alreadyFilled,
    assignmentId: result.assignmentId,
  };
}

/**
 * Handle an inbound NO response from a clinician.
 */
export async function handleNoResponse(
  clinicianId: string,
  phone: string
) {
  const offer = await prisma.broadcastOffer.findFirst({
    where: {
      clinicianId,
      status: "SENT",
    },
    orderBy: { sentAt: "desc" },
    include: { referral: true },
  });

  if (!offer) {
    return { handled: false, reason: "No pending offer found" };
  }

  await prisma.broadcastOffer.update({
    where: { id: offer.id },
    data: { status: "NO_RECEIVED", respondedAt: new Date() },
  });

  // Send acknowledgment
  const ackMsg = formatNoAcknowledgment();
  try {
    const sms = await sendSMS(phone, ackMsg);
    await prisma.communicationLog.create({
      data: {
        phone,
        message: ackMsg,
        direction: "OUTBOUND",
        twilioSid: sms.sid,
        referralId: offer.referralId,
        clinicianId,
      },
    });
  } catch {
    // Log failure
  }

  // Check if all offers for this referral have been declined
  const remainingOffers = await prisma.broadcastOffer.count({
    where: {
      referralId: offer.referralId,
      status: { in: ["SENT", "PENDING"] },
    },
  });

  if (remainingOffers === 0) {
    // All clinicians declined - mark referral as unfilled
    await prisma.referral.update({
      where: { id: offer.referralId },
      data: { status: "UNFILLED" },
    });
  }

  return { handled: true, referralId: offer.referralId };
}
