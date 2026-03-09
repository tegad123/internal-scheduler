import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const referral = await prisma.referral.findUnique({
      where: { id },
      include: {
        agency: true,
        broadcastOffers: {
          include: { clinician: true },
          orderBy: { createdAt: "desc" },
        },
        assignment: {
          include: { clinician: true },
        },
      },
    });

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(referral);
  } catch (error) {
    console.error("Failed to fetch referral:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const referral = await prisma.referral.update({
      where: { id },
      data: {
        patientName: body.patientName,
        patientPhone: body.patientPhone,
        patientAddress: body.patientAddress,
        patientCity: body.patientCity,
        patientState: body.patientState,
        patientZipCode: body.patientZipCode,
        discipline: body.discipline,
        status: body.status,
        priority: body.priority,
        notes: body.notes,
        agencyId: body.agencyId,
      },
      include: {
        agency: true,
      },
    });

    return NextResponse.json(referral);
  } catch (error) {
    console.error("Failed to update referral:", error);
    return NextResponse.json(
      { error: "Failed to update referral" },
      { status: 500 }
    );
  }
}
