"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Clinician {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  discipline: string;
  status: string;
  notes: string | null;
  createdAt: string;
  zipCoverages: { id: string; zipCode: string }[];
  credentials: {
    id: string;
    name: string;
    issuedAt: string | null;
    expiresAt: string | null;
    isVerified: boolean;
    notes: string | null;
  }[];
  broadcastOffers: {
    id: string;
    status: string;
    sentAt: string | null;
    respondedAt: string | null;
    referral: {
      id: string;
      patientName: string;
      patientZipCode: string;
      discipline: string;
    };
  }[];
  assignments: {
    id: string;
    assignedAt: string;
    notes: string | null;
    referral: {
      id: string;
      patientName: string;
      patientZipCode: string;
      discipline: string;
    };
  }[];
}

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

export default function ClinicianDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [clinician, setClinician] = useState<Clinician | null>(null);
  const [loading, setLoading] = useState(true);
  const [newZip, setNewZip] = useState("");

  const fetchClinician = useCallback(async () => {
    try {
      const res = await fetch(`/api/clinicians/${id}`);
      if (!res.ok) throw new Error("Failed to fetch clinician");
      const data = await res.json();
      setClinician(data);
    } catch {
      toast.error("Failed to load clinician");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClinician();
  }, [fetchClinician]);

  async function handleAddZip() {
    if (!newZip.trim()) return;
    try {
      const res = await fetch(`/api/clinicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addZipCodes: [newZip.trim()] }),
      });
      if (!res.ok) throw new Error("Failed to add ZIP");
      toast.success("ZIP code added");
      setNewZip("");
      fetchClinician();
    } catch {
      toast.error("Failed to add ZIP code");
    }
  }

  async function handleRemoveZip(zipId: string) {
    try {
      const res = await fetch(`/api/clinicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeZipIds: [zipId] }),
      });
      if (!res.ok) throw new Error("Failed to remove ZIP");
      toast.success("ZIP code removed");
      fetchClinician();
    } catch {
      toast.error("Failed to remove ZIP code");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading clinician...</p>
      </div>
    );
  }

  if (!clinician) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Clinician not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clinicians" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Clinicians
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {clinician.firstName} {clinician.lastName}
        </h1>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${clinicianStatusBgClass(clinician.status)}`}
        >
          {clinician.status}
        </span>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{clinician.email || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">{clinician.phone}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Discipline</dt>
              <dd className="mt-1 text-sm text-gray-900">{clinician.discipline}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Since</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(clinician.createdAt).toLocaleDateString()}
              </dd>
            </div>
            {clinician.notes && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{clinician.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="zip-coverage">
        <TabsList>
          <TabsTrigger value="zip-coverage">ZIP Coverage</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="offers">Offer History</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        {/* ZIP Coverage Tab */}
        <TabsContent value="zip-coverage">
          <Card>
            <CardHeader>
              <CardTitle>ZIP Coverage ({clinician.zipCoverages.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add ZIP code"
                  value={newZip}
                  onChange={(e) => setNewZip(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={handleAddZip} size="sm">
                  Add
                </Button>
              </div>
              {clinician.zipCoverages.length === 0 ? (
                <p className="text-sm text-gray-500">No ZIP codes assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {clinician.zipCoverages.map((zip) => (
                    <span
                      key={zip.id}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
                    >
                      {zip.zipCode}
                      <button
                        onClick={() => handleRemoveZip(zip.id)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                        title="Remove"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>Credentials</CardTitle>
            </CardHeader>
            <CardContent>
              {clinician.credentials.length === 0 ? (
                <p className="text-sm text-gray-500">No credentials on file</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Verified</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clinician.credentials.map((cred) => (
                      <TableRow key={cred.id}>
                        <TableCell className="font-medium">{cred.name}</TableCell>
                        <TableCell>
                          {cred.expiresAt
                            ? new Date(cred.expiresAt).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              cred.isVerified
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {cred.isVerified ? "Verified" : "Pending"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Offer History Tab */}
        <TabsContent value="offers">
          <Card>
            <CardHeader>
              <CardTitle>Offer History</CardTitle>
            </CardHeader>
            <CardContent>
              {clinician.broadcastOffers.length === 0 ? (
                <p className="text-sm text-gray-500">No offer history</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Discipline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Responded At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clinician.broadcastOffers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <Link
                            href={`/referrals/${offer.referral.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {offer.referral.id.slice(-6).toUpperCase()}
                          </Link>
                        </TableCell>
                        <TableCell>{offer.referral.patientName}</TableCell>
                        <TableCell>{offer.referral.discipline}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${offerStatusBgClass(offer.status)}`}
                          >
                            {offer.status.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {offer.sentAt
                            ? new Date(offer.sentAt).toLocaleString()
                            : "N/A"}
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
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              {clinician.assignments.length === 0 ? (
                <p className="text-sm text-gray-500">No assignments</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case ID</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Discipline</TableHead>
                      <TableHead>Assigned Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clinician.assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <Link
                            href={`/referrals/${assignment.referral.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {assignment.referral.id.slice(-6).toUpperCase()}
                          </Link>
                        </TableCell>
                        <TableCell>{assignment.referral.patientName}</TableCell>
                        <TableCell>{assignment.referral.discipline}</TableCell>
                        <TableCell>
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
