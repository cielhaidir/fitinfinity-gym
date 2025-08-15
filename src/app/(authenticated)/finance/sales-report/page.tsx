"use client";

import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { Receipt, Package, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";

export default function SalesReportPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date(),
  });
  const [selectedSales, setSelectedSales] = useState<string>("all");

  const { data: ptData, isLoading: isLoadingPTs } = api.personalTrainer.getAll.useQuery({});
  const { data: fcData, isLoading: isLoadingFCs } = api.fitnessConsultant.getAll.useQuery({});

  const salesOptions = useMemo(() => {
    const pts = ptData?.personalTrainers.map(pt => ({ value: pt.userId, label: `${pt.user.name} (PT)` })) || [];
    const fcs = fcData?.map(fc => ({ value: fc.userId, label: `${fc.user.name} (FC)` })) || [];
    return [{ value: "all", label: "All Sales" }, ...pts, ...fcs];
  }, [ptData, fcData]);

  const { data: reportData, isLoading, refetch } =
    api.salesReport.getSalesReportBySales.useQuery(
      { 
        page, 
        limit,
        startDate: dateRange.from,
        endDate: dateRange.to,
        salesId: selectedSales === "all" ? undefined : selectedSales,
      },
      {
        enabled: !!session && !!dateRange.from && !!dateRange.to,
        refetchOnWindowFocus: false,
      },
    );

  const handleApplyFilters = () => {
    void refetch();
  };

  const handleResetFilters = () => {
    setDateRange({
      from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
      to: new Date(),
    });
    setSelectedSales("all");
    void refetch();
  };

  const salesSummaryData = reportData?.salesSummary ?? [];
  const detailedTransactions = reportData?.detailedTransactions ?? [];
  const pagination = reportData?.pagination;

  const totalRevenue = useMemo(() => 
    salesSummaryData.reduce(
      (sum, item) => sum + item.totalRevenue,
      0
    ),
    [salesSummaryData]
  );
  
  const totalSubscriptions = pagination?.total ?? 0;

  const salesSummaryColumns: ColumnDef<any>[] = [
    {
      accessorKey: "salesName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Name" />,
    },
    {
      accessorKey: "salesType",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sales Type" />,
    },
    {
      accessorKey: "totalRevenue",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total Revenue" />,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalRevenue"));
        const formatted = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
        return <div className="font-medium text-green-600">{formatted}</div>;
      },
    },
  ];

  const salesDetailColumns: ColumnDef<any>[] = [
    {
      accessorKey: "member.user.name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Member" />,
      cell: ({ row }) => {
        const memberName = row.original.member.user.name;
        const memberEmail = row.original.member.user.email;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{memberName || "N/A"}</span>
            <span className="text-xs text-muted-foreground">{memberEmail}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "package.name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Subscription Package" />,
      cell: ({ row }) => {
        const packageName = row.original.package?.name;
        const subsType = row.original.subsType;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{packageName || "N/A"}</span>
            <Badge variant="outline" className="mt-1 w-fit">
              {subsType === "gym" ? "Gym Membership" : "Personal Trainer"}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "totalPayment",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalPayment"));
        const formatted = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
        return <div className="font-medium text-green-600">{formatted}</div>;
      },
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Transaction Date" />,
        cell: ({ row }) => {
          const date = new Date(row.getValue("createdAt"));
          return <span>{date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>;
        },
      },
  ];

  return (
    <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Sales Revenue Report</h2>
          <p className="text-muted-foreground">
            Monitor revenue generated by Personal Trainers and Fitness Consultants.
          </p>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full md:w-auto" />
          <Select value={selectedSales} onValueChange={setSelectedSales}>
            <SelectTrigger className="w-full md:w-[280px]"><SelectValue placeholder="Select Sales" /></SelectTrigger>
            <SelectContent>
