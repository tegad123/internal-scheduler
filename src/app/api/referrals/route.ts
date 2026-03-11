import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Discipline, ReferralStatus } from "@prisma/client";
import { findEligibleClinicians } from "@/lib/services/matching";
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

    const referral = await prisma.referral.create({
      data: {
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
      },
      include: {
        agency: true,
      },
    });

    // Auto-match and broadcast
    const matches = await findEligibleClinicians(
      discipline as Discipline,
      patientZipCode
    );

    if (matches.length > 0) {
      const clinicianIds = matches.map((c) => c.id);
      const broadcastResult = await broadcastOffers(referral.id, clinicianIds);

      return NextResponse.json(
        {
          referral,
          broadcast: broadcastResult,
        },
        { status: 201 }
      );
    }

    // No matches — mark as unfilled
    const updatedReferral = await prisma.referral.update({
      where: { id: referral.id },
      data: { status: "UNFILLED" },
      include: { agency: true },
    });

    return NextResponse.json(
      {
        referral: updatedReferral,
        broadcast: null,
        message:
          "No eligible clinicians found for this discipline and ZIP code",
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
