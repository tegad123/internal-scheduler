import { prisma } from "../db";
import { Discipline } from "@prisma/client";

export async function findEligibleClinicians(
  discipline: Discipline,
  zipCode: string
) {
  const now = new Date();

  // Normalize ZIP to 5 digits (strip ZIP+4 like "77459-1107" → "77459")
  const normalizedZip = zipCode.split("-")[0].trim().slice(0, 5);

  const clinicians = await prisma.clinician.findMany({
    where: {
      discipline,
      status: "ACTIVE",
      zipCoverages: {
        some: { zipCode: normalizedZip },
      },
      // No expired credentials
      credentials: {
        none: {
          expiresAt: { lt: now },
          isVerified: true,
        },
      },
    },
    include: {
      zipCoverages: true,
      credentials: true,
      // Check for active assignments (not blocked)
      assignments: {
        include: { referral: true },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return clinicians;
}
