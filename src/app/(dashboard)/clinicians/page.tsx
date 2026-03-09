import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function clinicianStatusBgClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "ONBOARDING":
      return "bg-yellow-100 text-yellow-800";
    case "CREDENTIALING":
      return "bg-blue-100 text-blue-800";
    case "INACTIVE":
      return "bg-gray-100 text-gray-600";
    case "SUSPENDED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function CliniciansPage() {
  const clinicians = await prisma.clinician.findMany({
    orderBy: { lastName: "asc" },
    include: {
      _count: { select: { zipCoverages: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clinicians</h1>
        <Link href="/clinicians/new">
          <Button>Add Clinician</Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Discipline</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>ZIP Count</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clinicians.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  No clinicians found
                </TableCell>
              </TableRow>
            ) : (
              clinicians.map((clinician) => (
                <TableRow key={clinician.id}>
                  <TableCell className="font-medium">
                    {clinician.firstName} {clinician.lastName}
                  </TableCell>
                  <TableCell>{clinician.discipline}</TableCell>
                  <TableCell>{clinician.phone}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${clinicianStatusBgClass(clinician.status)}`}
                    >
                      {clinician.status}
                    </span>
                  </TableCell>
                  <TableCell>{clinician._count.zipCoverages}</TableCell>
                  <TableCell>
                    <Link
                      href={`/clinicians/${clinician.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
