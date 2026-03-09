"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Referral {
  id: string;
  patientName: string;
  patientPhone: string | null;
  patientAddress: string | null;
  patientCity: string | null;
  patientState: string | null;
  patientZipCode: string;
  discipline: string;
  status: string;
  priority: string;
  notes: string | null;
  agencyId: string;
  createdAt: string;
  agency: { id: string; name: string };
  broadcastOffers: BroadcastOffer[];
  assignment: Assignment | null;
}

interface BroadcastOffer {
  id: string;
  clinicianId: string;
  status: string;
  sentAt: string | null;
  respondedAt: string | null;
  clinician: { id: string; firstName: string; lastName: string; phone: string };
}

interface Assignment {
  id: string;
  clinicianId: string;
  assignedAt: string;
  notes: string | null;
  clinician: { id: string; firstName: string; lastName: string };
}

interface MatchedClinician {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  discipline: string;
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

function offerStatusBgClass(status: string) {
  switch (status) {
    case "SENT":
    case "PENDING":
      return "bg-blue-100 text-blue-800";
    case "YES_RECEIVED":
    case "WON":
      return "bg-green-100 text-green-800";
    case "NO_RECEIVED":
      return "bg-gray-100 text-gray-600";
    case "LOST_FILLED":
      return "bg-yellow-100 text-yellow-800";
    case "EXPIRED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function ReferralDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchedClinicians, setMatchedClinicians] = useState<MatchedClinician[]>([]);
  const [selectedClinicians, setSelectedClinicians] = useState<Set<string>>(new Set());
  const [matching, setMatching] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchReferral = useCallback(async () => {
    try {
      const res = await fetch(`/api/referrals/${id}`);
      if (!res.ok) throw new Error("Failed to fetch referral");
      const data = await res.json();
      setReferral(data);
    } catch {
      toast.error("Failed to load referral");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReferral();
  }, [fetchReferral]);

  async function handleFindMatches() {
    setMatching(true);
    try {
      const res = await fetch(`/api/referrals/${id}/match`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to find matches");
      const data = await res.json();
      setMatchedClinicians(data.clinicians || data);
      setSelectedClinicians(new Set());
      toast.success(`Found ${(data.clinicians || data).length} matching clinicians`);
    } catch {
      toast.error("Failed to find matches");
    } finally {
      setMatching(false);
    }
  }

  async function handleSendOffers() {
    if (selectedClinicians.size === 0) {
      toast.error("Select at least one clinician");
      return;
    }
    setBroadcasting(true);
    try {
      const res = await fetch(`/api/referrals/${id}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicianIds: Array.from(selectedClinicians) }),
      });
      if (!res.ok) throw new Error("Failed to send offers");
      toast.success("Offers sent successfully");
      setMatchedClinicians([]);
      setSelectedClinicians(new Set());
      fetchReferral();
    } catch {
      toast.error("Failed to send offers");
    } finally {
      setBroadcasting(false);
    }
  }

  function toggleClinician(clinicianId: string) {
    setSelectedClinicians((prev) => {
      const next = new Set(prev);
      if (next.has(clinicianId)) {
        next.delete(clinicianId);
      } else {
        next.add(clinicianId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading referral...</p>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Referral not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/referrals" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Referrals
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Referral {referral.id.slice(-6).toUpperCase()}
        </h1>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusBgClass(referral.status)}`}
        >
          {referral.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Referral Info */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Patient Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{referral.patientName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">{referral.patientPhone || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Discipline</dt>
              <dd className="mt-1 text-sm text-gray-900">{referral.discipline}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {[referral.patientAddress, referral.patientCity, referral.patientState]
                  .filter(Boolean)
                  .join(", ") || "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">ZIP Code</dt>
              <dd className="mt-1 text-sm text-gray-900">{referral.patientZipCode}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Priority</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{referral.priority}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Agency</dt>
              <dd className="mt-1 text-sm text-gray-900">{referral.agency.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(referral.createdAt).toLocaleDateString()}
              </dd>
            </div>
            {referral.notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{referral.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Match Clinicians */}
      <Card>
        <CardHeader>
          <CardTitle>Match Clinicians</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleFindMatches} disabled={matching}>
            {matching ? "Searching..." : "Find Matches"}
          </Button>

          {matchedClinicians.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Discipline</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedClinicians.map((clinician) => (
                      <TableRow key={clinician.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedClinicians.has(clinician.id)}
                            onChange={() => toggleClinician(clinician.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          {clinician.firstName} {clinician.lastName}
                        </TableCell>
                        <TableCell>{clinician.discipline}</TableCell>
                        <TableCell>{clinician.phone}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button onClick={handleSendOffers} disabled={broadcasting || selectedClinicians.size === 0}>
                {broadcasting ? "Sending..." : `Send Offers (${selectedClinicians.size})`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offer Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>Offer Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          {referral.broadcastOffers.length === 0 ? (
            <p className="text-sm text-gray-500">No offers sent yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clinician Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Responded At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referral.broadcastOffers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      {offer.clinician.firstName} {offer.clinician.lastName}
                    </TableCell>
                    <TableCell>{offer.clinician.phone}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${offerStatusBgClass(offer.status)}`}
                      >
                        {offer.status.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      {offer.sentAt ? new Date(offer.sentAt).toLocaleString() : "N/A"}
                    </TableCell>
                    <TableCell>
                      {offer.respondedAt
                        ? new Date(offer.respondedAt).toLocaleString()
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assignment Info */}
      {referral.assignment && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Clinician</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {referral.assignment.clinician.firstName}{" "}
                  {referral.assignment.clinician.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Assigned Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(referral.assignment.assignedAt).toLocaleDateString()}
                </dd>
              </div>
              {referral.assignment.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">{referral.assignment.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
