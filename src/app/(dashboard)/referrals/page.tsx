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

function statusBgClass(status: string) {
  switch (status) {
    case "NEW":
      return "bg-gray-100 text-gray-800";
    case "MATCHING":
      return "bg-gray-200 text-gray-800";
    case "OFFER_SENT":
      return "bg-blue-100 text-blue-800";
    case "ASSIGNED":
      return "bg-green-100 text-green-800";
    case "UNFILLED":
      return "bg-red-100 text-red-800";
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    case "VISIT_COMPLETED":
      return "bg-emerald-100 text-emerald-800";
    case "DOCUMENTATION_RECEIVED":
      return "bg-teal-100 text-teal-800";
    case "READY_FOR_BILLING":
      return "bg-purple-100 text-purple-800";
    case "CLOSED":
      return "bg-gray-50 text-gray-600";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function ReferralsPage() {
  const referrals = await prisma.referral.findMany({
    orderBy: { createdAt: "desc" },
    include: { agency: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
        <Link href="/referrals/new">
          <Button>New Referral</Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case ID</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Discipline</TableHead>
              <TableHead>ZIP</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500">
                  No referrals found
                </TableCell>
              </TableRow>
            ) : (
              referrals.map((referral) => (
                <TableRow key={referral.id}>
                  <TableCell className="font-medium">
                    {referral.id.slice(-6).toUpperCase()}
                  </TableCell>
                  <TableCell>{referral.patientName}</TableCell>
                  <TableCell>{referral.discipline}</TableCell>
                  <TableCell>{referral.patientZipCode}</TableCell>
                  <TableCell>{referral.agency.name}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBgClass(referral.status)}`}
                    >
                      {referral.status.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {referral.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/referrals/${referral.id}`}
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
