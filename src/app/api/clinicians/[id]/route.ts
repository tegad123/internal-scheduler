import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clinician = await prisma.clinician.findUnique({
      where: { id },
      include: {
        zipCoverages: true,
        credentials: true,
        broadcastOffers: {
          include: { referral: true },
          orderBy: { createdAt: "desc" },
        },
        assignments: {
          include: { referral: true },
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    if (!clinician) {
      return NextResponse.json(
        { error: "Clinician not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(clinician);
  } catch (error) {
    console.error("Failed to fetch clinician:", error);
    return NextResponse.json(
      { error: "Failed to fetch clinician" },
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

    const { zipCodes, ...clinicianData } = body;

    // If zipCodes array is provided, delete existing and recreate
    if (zipCodes && Array.isArray(zipCodes)) {
      await prisma.zipCoverage.deleteMany({
        where: { clinicianId: id },
      });

      await prisma.zipCoverage.createMany({
        data: zipCodes.map((zipCode: string) => ({
          clinicianId: id,
          zipCode,
        })),
      });
    }

    const clinician = await prisma.clinician.update({
      where: { id },
      data: {
        firstName: clinicianData.firstName,
        lastName: clinicianData.lastName,
        email: clinicianData.email,
        phone: clinicianData.phone,
        discipline: clinicianData.discipline,
        status: clinicianData.status,
        notes: clinicianData.notes,
      },
      include: {
        zipCoverages: true,
        credentials: true,
      },
    });

    return NextResponse.json(clinician);
  } catch (error) {
    console.error("Failed to update clinician:", error);
    return NextResponse.json(
      { error: "Failed to update clinician" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.clinician.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete clinician:", error);
    return NextResponse.json(
      { error: "Failed to delete clinician" },
      { status: 500 }
    );
  }
}
