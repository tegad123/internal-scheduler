import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const agencies = await prisma.agency.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(agencies);
  } catch (error) {
    console.error("Failed to fetch agencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch agencies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, phone, email, address, city, state, zipCode, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Agency name is required" },
        { status: 400 }
      );
    }

    const agency = await prisma.agency.create({
      data: {
        name,
        phone,
        email,
        address,
        city,
        state,
        zipCode,
        notes,
      },
    });

    return NextResponse.json(agency, { status: 201 });
  } catch (error) {
    console.error("Failed to create agency:", error);
    return NextResponse.json(
      { error: "Failed to create agency" },
      { status: 500 }
    );
  }
}
