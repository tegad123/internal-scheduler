import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import path from "path";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// --- Helpers ---

function normalizePhone(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function parseName(raw: unknown): { firstName: string; lastName: string; isInactive: boolean } | null {
  if (!raw || typeof raw !== "string") return null;
  let name = raw.trim();
  if (!name) return null;

  const inactivePattern = /DON.?T USE|NOT.?READY|WAITIN|DO NOT|INACTIVE|not taking|no accepting|don.?t reply/i;
  const isInactive = inactivePattern.test(name);

  // Strip annotations after first *
  name = name.replace(/\*+.*$/g, "").trim();
  // Also remove trailing whitespace and commas
  name = name.replace(/,\s*$/, "").trim();
  if (!name) return null;

  let firstName: string;
  let lastName: string;

  if (name.includes(",")) {
    const parts = name.split(",").map((s) => s.trim());
    lastName = parts[0] || "";
    firstName = parts[1] || "";
  } else {
    const parts = name.split(/\s+/);
    firstName = parts[0] || "";
    lastName = parts.slice(1).join(" ") || "";
  }

  if (!firstName && !lastName) return null;
  return { firstName, lastName, isInactive };
}

function mapDiscipline(title: unknown): string | null {
  if (!title || typeof title !== "string") return null;
  const t = title.trim().toUpperCase().replace(/^\s+/, "");
  if (t === "ST") return "SLP";
  if (["OT", "PT", "SLP", "MSW", "COTA", "PTA"].includes(t)) return t;
  return null;
}

interface ClinicianRow {
  firstName: string;
  lastName: string;
  phone: string;
  discipline: string;
  email: string | null;
  notes: string | null;
  isInactive: boolean;
}

// --- Section configs (0-indexed row numbers matching pandas output) ---
interface SectionConfig {
  startRow: number;
  endRow: number;
  nameCol: number;
  titleCol: number;
  phoneCol: number;
  territoryCol: number;
  emailCol?: number;
}

const sections: SectionConfig[] = [
  // MSW/ST section (rows 2-4 in spreadsheet)
  { startRow: 2, endRow: 4, nameCol: 0, titleCol: 1, phoneCol: 2, territoryCol: 3 },
  // PT section (rows 8-25)
  { startRow: 8, endRow: 25, nameCol: 0, titleCol: 2, phoneCol: 3, territoryCol: 4 },
  // PTA section (rows 28-55)
  { startRow: 28, endRow: 55, nameCol: 0, titleCol: 2, phoneCol: 3, territoryCol: 4 },
  // OT section (rows 59-67)
  { startRow: 59, endRow: 67, nameCol: 0, titleCol: 2, phoneCol: 3, territoryCol: 6, emailCol: 5 },
  // COTA section (rows 71-98)
  { startRow: 71, endRow: 98, nameCol: 0, titleCol: 2, phoneCol: 3, territoryCol: 6, emailCol: 5 },
];

async function main() {
  // --- Admin user ---
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
  console.log("Admin user:", admin.email);

  // --- Sample agencies ---
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
  console.log("Agencies:", agency1.name, "|", agency2.name);

  // --- Clear existing clinician data ---
  await prisma.assignment.deleteMany({});
  await prisma.broadcastOffer.deleteMany({});
  await prisma.communicationLog.deleteMany({});
  await prisma.credential.deleteMany({});
  await prisma.zipCoverage.deleteMany({});
  await prisma.clinician.deleteMany({});
  console.log("Cleared existing clinician data");

  // --- Read spreadsheet ---
  const filePath = path.resolve("/Users/tegaumukoro/Downloads/PT OT MSW Therapist.xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // --- Parse clinicians ---
  const clinicianMap = new Map<string, ClinicianRow>();
  let skippedNoPhone = 0;
  let skippedBadName = 0;
  let skippedNoDiscipline = 0;

  for (const section of sections) {
    for (let i = section.startRow; i <= section.endRow && i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[section.nameCol]) continue;

      // Skip header rows and non-data rows
      const rawName = String(row[section.nameCol] || "");
      if (/^(Therapist|OT|COTA|PTA|\s+)$/i.test(rawName.trim())) continue;
      if (/^additonal|^additional/i.test(rawName.trim())) continue;

      const parsed = parseName(rawName);
      if (!parsed) { skippedBadName++; continue; }

      const rawTitle = row[section.titleCol];
      const discipline = mapDiscipline(rawTitle);
      if (!discipline) { skippedNoDiscipline++; continue; }

      const rawPhone = row[section.phoneCol];
      const phone = normalizePhone(rawPhone);
      if (!phone) { skippedNoPhone++; continue; }

      const territory = row[section.territoryCol]
        ? String(row[section.territoryCol]).trim()
        : null;

      let email: string | null = null;
      if (section.emailCol !== undefined && row[section.emailCol]) {
        const rawEmail = String(row[section.emailCol]).trim();
        if (rawEmail.includes("@")) email = rawEmail;
      }

      // Dedup by phone
      if (clinicianMap.has(phone)) {
        const existing = clinicianMap.get(phone)!;
        if (territory) {
          existing.notes = existing.notes
            ? `${existing.notes}\n${territory}`
            : territory;
        }
        continue;
      }

      clinicianMap.set(phone, {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone,
        discipline,
        email,
        notes: territory,
        isInactive: parsed.isInactive,
      });
    }
  }

  // --- Deduplicate emails (email has @unique constraint) ---
  const seenEmails = new Set<string>();
  for (const c of clinicianMap.values()) {
    if (c.email) {
      const lower = c.email.toLowerCase();
      if (seenEmails.has(lower)) {
        c.email = null; // remove duplicate
      } else {
        seenEmails.add(lower);
      }
    }
  }

  // --- Insert clinicians ---
  let activeCount = 0;
  let inactiveCount = 0;

  for (const c of clinicianMap.values()) {
    const status = c.isInactive ? "INACTIVE" : "ACTIVE";
    if (c.isInactive) inactiveCount++;
    else activeCount++;

    await prisma.clinician.create({
      data: {
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        email: c.email,
        discipline: c.discipline as any,
        status,
        notes: c.notes,
      },
    });
  }

  console.log(`\nImported ${clinicianMap.size} clinicians:`);
  console.log(`  Active: ${activeCount}`);
  console.log(`  Inactive: ${inactiveCount}`);
  console.log(`  Skipped (no phone): ${skippedNoPhone}`);
  console.log(`  Skipped (bad name): ${skippedBadName}`);
  console.log(`  Skipped (no discipline): ${skippedNoDiscipline}`);

  // --- Summary by discipline ---
  const byDiscipline: Record<string, number> = {};
  for (const c of clinicianMap.values()) {
    byDiscipline[c.discipline] = (byDiscipline[c.discipline] || 0) + 1;
  }
  console.log("\nBy discipline:", byDiscipline);

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
