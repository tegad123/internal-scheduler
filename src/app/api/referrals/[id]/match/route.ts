import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findEligibleClinicians } from "@/lib/services/matching";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const referral = await prisma.referral.findUnique({
      where: { id },
    });

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    const clinicians = await findEligibleClinicians(
      referral.discipline,
      referral.patientZipCode
    );

    return NextResponse.json(clinicians);
  } catch (error) {
    console.error("Failed to find matching clinicians:", error);
    return NextResponse.json(
      { error: "Failed to find matching clinicians" },
      { status: 500 }
    );
  }
}
