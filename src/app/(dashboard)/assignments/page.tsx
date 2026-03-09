import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const assignments = await prisma.assignment.findMany({
    orderBy: { assignedAt: "desc" },
    include: {
      referral: {
        include: { agency: true },
      },
      clinician: true,
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Discipline</TableHead>
              <TableHead>Clinician</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Assigned Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  No assignments found
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <Link
                      href={`/referrals/${assignment.referral.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {assignment.referral.id.slice(-6).toUpperCase()}
                    </Link>
                  </TableCell>
                  <TableCell>{assignment.referral.patientName}</TableCell>
                  <TableCell>{assignment.referral.discipline}</TableCell>
                  <TableCell>
                    {assignment.clinician.firstName} {assignment.clinician.lastName}
                  </TableCell>
                  <TableCell>{assignment.referral.agency.name}</TableCell>
                  <TableCell>
                    {assignment.assignedAt.toLocaleDateString()}
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
