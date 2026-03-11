import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@hctscheduler.com" },
    update: {},
    create: {
      email: "admin@hctscheduler.com",
      name: "Admin",
      hashedPassword,
      role: "admin",
    },
  });
  console.log("Created admin user:", admin.email);

  // Create sample agencies
  const agency1 = await prisma.agency.upsert({
    where: { id: "sample-agency-1" },
    update: {},
    create: {
      id: "sample-agency-1",
      name: "Sunrise Home Health",
      phone: "555-100-1000",
      email: "referrals@sunrisehh.com",
      city: "Houston",
      state: "TX",
      zipCode: "77001",
    },
  });

  const agency2 = await prisma.agency.upsert({
    where: { id: "sample-agency-2" },
    update: {},
    create: {
      id: "sample-agency-2",
      name: "CareFirst Home Services",
      phone: "555-200-2000",
      email: "intake@carefirst.com",
      city: "Dallas",
      state: "TX",
      zipCode: "75201",
    },
  });
  console.log("Created sample agencies:", agency1.name, agency2.name);

  // Create sample clinicians
  const clinician1 = await prisma.clinician.upsert({
    where: { phone: "+15551001001" },
    update: {},
    create: {
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.j@example.com",
      phone: "+15551001001",
      discipline: "OT",
      status: "ACTIVE",
    },
  });

  const clinician2 = await prisma.clinician.upsert({
    where: { phone: "+15551001002" },
    update: {},
    create: {
      firstName: "Michael",
      lastName: "Chen",
      email: "m.chen@example.com",
      phone: "+15551001002",
      discipline: "PT",
      status: "ACTIVE",
    },
  });

  const clinician3 = await prisma.clinician.upsert({
    where: { phone: "+15551001003" },
    update: {},
    create: {
      firstName: "Lisa",
      lastName: "Williams",
      email: "l.williams@example.com",
      phone: "+15551001003",
      discipline: "OT",
      status: "ACTIVE",
    },
  });
  console.log("Created sample clinicians");

  // Add ZIP coverage
  const zipEntries = [
    { clinicianId: clinician1.id, zipCode: "77001" },
    { clinicianId: clinician1.id, zipCode: "77002" },
    { clinicianId: clinician1.id, zipCode: "77003" },
    { clinicianId: clinician2.id, zipCode: "77001" },
    { clinicianId: clinician2.id, zipCode: "75201" },
    { clinicianId: clinician3.id, zipCode: "77001" },
    { clinicianId: clinician3.id, zipCode: "77002" },
  ];

  for (const entry of zipEntries) {
    await prisma.zipCoverage.upsert({
      where: {
        clinicianId_zipCode: {
          clinicianId: entry.clinicianId,
          zipCode: entry.zipCode,
        },
      },
      update: {},
      create: entry,
    });
  }
  console.log("Added ZIP coverage entries");

  // Add sample credentials
  const credentials = [
    { clinicianId: clinician1.id, name: "OT License", isVerified: true, expiresAt: new Date("2027-12-31") },
    { clinicianId: clinician1.id, name: "CPR Certification", isVerified: true, expiresAt: new Date("2027-06-30") },
    { clinicianId: clinician2.id, name: "PT License", isVerified: true, expiresAt: new Date("2027-12-31") },
    { clinicianId: clinician3.id, name: "OT License", isVerified: true, expiresAt: new Date("2027-12-31") },
  ];

  for (const cred of credentials) {
    await prisma.credential.create({ data: cred });
  }
  console.log("Added sample credentials");

  console.log("\nSeed completed successfully!");
  console.log("Login: admin@hctscheduler.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
