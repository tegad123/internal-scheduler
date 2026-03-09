import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const referralId = searchParams.get("referralId");
    const clinicianId = searchParams.get("clinicianId");

    const where: {
      referralId?: string;
      clinicianId?: string;
    } = {};

    if (referralId) {
      where.referralId = referralId;
    }

    if (clinicianId) {
      where.clinicianId = clinicianId;
    }

    const logs = await prisma.communicationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch communication logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch communication logs" },
      { status: 500 }
    );
  }
}
