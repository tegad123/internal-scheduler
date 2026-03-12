import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Discipline, ReferralStatus } from "@prisma/client";
import { broadcastOffers } from "@/lib/services/broadcast";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ReferralStatus | null;
    const discipline = searchParams.get("discipline") as Discipline | null;

    const where: {
      status?: ReferralStatus;
      discipline?: Discipline;
    } = {};

    if (status) {
      where.status = status;
    }

    if (discipline) {
      where.discipline = discipline;
    }

    const referrals = await prisma.referral.findMany({
      where,
      include: {
        agency: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(referrals);
  } catch (error) {
    console.error("Failed to fetch referrals:", error);
    return NextResponse.json(
      { error: "Failed to fetch referrals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      patientName,
      patientPhone,
      patientAddress,
      patientCity,
      patientState,
      patientZipCode,
      discipline,
      priority,
      notes,
      agencyId,
    } = body;

    if (!patientName || !patientZipCode || !discipline || !agencyId) {
      return NextResponse.json(
        {
          error:
            "patientName, patientZipCode, discipline, and agencyId are required",
        },
        { status: 400 }
      );
    }

    // Normalize ZIP to 5 digits (strip ZIP+4 like "77459-1107" → "77459")
    const normalizedZip = patientZipCode.split("-")[0].trim().slice(0, 5);

    const referral = await prisma.referral.create({
      data: {
        patientName,
        patientPhone,
        patientAddress,
        patientCity,
        patientState,
        patientZipCode: normalizedZip,
        discipline,
        priority,
        notes,
        agencyId,
      },
      include: {
        agency: true,
      },
    });

    // Broadcast to ALL active clinicians (regardless of discipline or ZIP)
    const activeClinicians = await prisma.clinician.findMany({
      where: {
        status: "ACTIVE",
        phone: { not: "" },
      },
      select: { id: true },
    });

    if (activeClinicians.length > 0) {
      const clinicianIds = activeClinicians.map((c) => c.id);
      const broadcastResult = await broadcastOffers(referral.id, clinicianIds);

      return NextResponse.json(
        {
          referral,
          broadcast: broadcastResult,
        },
        { status: 201 }
      );
    }

    // No active clinicians — mark as unfilled
    const updatedReferral = await prisma.referral.update({
      where: { id: referral.id },
      data: { status: "UNFILLED" },
      include: { agency: true },
    });

    return NextResponse.json(
      {
        referral: updatedReferral,
        broadcast: null,
        message: "No active clinicians found",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create referral:", error);
    return NextResponse.json(
      { error: "Failed to create referral" },
      { status: 500 }
    );
  }
}
