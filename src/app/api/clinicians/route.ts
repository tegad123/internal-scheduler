import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Discipline, ClinicianStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const discipline = searchParams.get("discipline") as Discipline | null;
    const status = searchParams.get("status") as ClinicianStatus | null;

    const where: {
      discipline?: Discipline;
      status?: ClinicianStatus;
    } = {};

    if (discipline) {
      where.discipline = discipline;
    }

    if (status) {
      where.status = status;
    }

    const clinicians = await prisma.clinician.findMany({
      where,
      include: {
        zipCoverages: true,
        credentials: true,
      },
      orderBy: { lastName: "asc" },
    });

    return NextResponse.json(clinicians);
  } catch (error) {
    console.error("Failed to fetch clinicians:", error);
    return NextResponse.json(
      { error: "Failed to fetch clinicians" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      discipline,
      status,
      notes,
      zipCodes,
    } = body;

    if (!firstName || !lastName || !phone || !discipline) {
      return NextResponse.json(
        { error: "firstName, lastName, phone, and discipline are required" },
        { status: 400 }
      );
    }

    const clinician = await prisma.clinician.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        discipline,
        status,
        notes,
        zipCoverages: {
          create: (zipCodes || []).map((zipCode: string) => ({
            zipCode,
          })),
        },
      },
      include: {
        zipCoverages: true,
        credentials: true,
      },
    });

    return NextResponse.json(clinician, { status: 201 });
  } catch (error) {
    console.error("Failed to create clinician:", error);
    return NextResponse.json(
      { error: "Failed to create clinician" },
      { status: 500 }
    );
  }
}
