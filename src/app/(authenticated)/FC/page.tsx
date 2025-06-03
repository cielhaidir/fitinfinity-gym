"use client";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Users, UserPlus, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { FC_MEMBER } from "@prisma/client";
export default function FCDashboard() {
  const { data: members } = api.fcMember.getAll.useQuery(undefined, {
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const getStatusCounts = () => {
    if (!members) return {
      new: 0,
      contacted: 0,
      converted: 0,
      not_interested: 0
    };

    return members.reduce((acc: {
      new: number;
      contacted: number;
      converted: number;
      not_interested: number;
    }, member: FC_MEMBER) => {
      switch (member.status) {
        case "new":
          acc.new++;
          break;
        case "contacted":
        case "follow_up":
          acc.contacted++;
          break;
        case "converted":
          acc.converted++;
          break;
        case "not_interested":
        case "rejected":
          acc.not_interested++;
          break;
      }
      return acc;
    }, {
      new: 0,
      contacted: 0,
      converted: 0,
      not_interested: 0
    });
  };

  const stats = getStatusCounts();

  return (
    <>
      <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Fitness Consultant Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your member management.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/fc/members" search="status=new">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Leads</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.new}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/fc/members" search="status=contacted">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.contacted}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/fc/members" search="status=converted">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.converted}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/fc/members" search="status=not_interested">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Not Interested</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.not_interested}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-8">
        <Link 
          href="/fc/members" 
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          View All Members
        </Link>
      </div>
    </div>
    </>
  );
}
