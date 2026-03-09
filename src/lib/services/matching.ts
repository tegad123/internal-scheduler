import { prisma } from "../db";
import { Discipline } from "@prisma/client";

export async function findEligibleClinicians(
  discipline: Discipline,
  zipCode: string
) {
  const now = new Date();

  const clinicians = await prisma.clinician.findMany({
    where: {
      discipline,
      status: "ACTIVE",
      zipCoverages: {
        some: { zipCode },
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
