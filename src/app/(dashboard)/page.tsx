import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function statusColor(status: string) {
  switch (status) {
    case "NEW":
      return "secondary";
    case "MATCHING":
      return "secondary";
    case "OFFER_SENT":
      return "default";
    case "ASSIGNED":
      return "default";
    case "UNFILLED":
      return "destructive";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

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
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [openReferrals, activeOffers, assignmentsToday, activeClinicians, recentReferrals] =
    await Promise.all([
      prisma.referral.count({
        where: { status: { in: ["NEW", "MATCHING", "OFFER_SENT"] } },
      }),
      prisma.broadcastOffer.count({
        where: { status: "SENT" },
      }),
      prisma.assignment.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.clinician.count({
        where: { status: "ACTIVE" },
      }),
      prisma.referral.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { agency: true },
      }),
    ]);

  const stats = [
    { label: "Open Referrals", value: openReferrals },
    { label: "Active Offers", value: activeOffers },
    { label: "Assignments Today", value: assignmentsToday },
    { label: "Active Clinicians", value: activeClinicians },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Discipline</TableHead>
                <TableHead>ZIP</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReferrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No referrals found
                  </TableCell>
                </TableRow>
              ) : (
                recentReferrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <Link
                        href={`/referrals/${referral.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {referral.id.slice(-6).toUpperCase()}
                      </Link>
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
