import { NextResponse } from "next/server";
import { broadcastOffers } from "@/lib/services/broadcast";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { clinicianIds } = body;

    if (!clinicianIds || !Array.isArray(clinicianIds) || clinicianIds.length === 0) {
      return NextResponse.json(
        { error: "clinicianIds array is required and must not be empty" },
        { status: 400 }
      );
    }

    const result = await broadcastOffers(id, clinicianIds);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to broadcast offers:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to broadcast offers" },
      { status: 500 }
    );
  }
}
