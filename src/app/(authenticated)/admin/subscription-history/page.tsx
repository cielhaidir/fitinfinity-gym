"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { Package, Users, Calendar, Clock, CreditCard, Edit } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminSubscriptionHistoryPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState("member.user.name");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [selectedSalesId, setSelectedSalesId] = useState<string>("");
  const [selectedSalesType, setSelectedSalesType] = useState<string>("");
  const { toast } = useToast();

  // Query for getting all subscriptions with required fields
  const { data: subscriptions, isLoading, refetch } = api.subs.list.useQuery(
    { 
      page, 
      limit, 
      search: search || undefined, 
      searchColumn: searchColumn || undefined,
    },
    {
      enabled: !!session,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    },
  );

  // Query for getting sales list to get sales names
  const { data: salesList } = api.subs.getSalesList.useQuery(undefined, {
    enabled: !!session,
  });

  // Mutation for updating sales information
  const updateSalesMutation = api.subs.updateSales.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sales information updated successfully",
      });
      setEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sales information",
        variant: "destructive",
      });
    },
  });

  // Helper function to get sales person name
  const getSalesPersonName = (salesId: string | null, salesType: string | null) => {
    if (!salesId || !salesType || !salesList) {
      return "Not assigned";
    }
    
    const salesperson = salesList.find(s => s.id === salesId);
    return salesperson ? salesperson.name : "Unknown";
  };

  const handleEditSales = (subscription: any) => {
    setSelectedSubscription(subscription);
    setSelectedSalesId(subscription.salesId || "none");
    setSelectedSalesType(subscription.salesType || "none");
    setEditDialogOpen(true);
  };

  const handleSaveSales = () => {
    if (!selectedSubscription) return;

    updateSalesMutation.mutate({
      subscriptionId: selectedSubscription.id,
      salesId: selectedSalesId === "none" ? null : selectedSalesId,
      salesType: selectedSalesType === "none" ? null : selectedSalesType as "PersonalTrainer" | "FC",
    });
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "member.user.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member Name" />
      ),
      cell: ({ row }) => {
        const memberName = row.original.member?.user?.name as string | undefined;
        const memberEmail = row.original.member?.user?.email as string | undefined;
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
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Package Name" />
      ),
      cell: ({ row }) => {
        const packageName = row.original.package?.name;
        return <span className="font-medium">{packageName || "N/A"}</span>;
      },
    },
    {
      accessorKey: "startDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Start Date" />
      ),
      cell: ({ row }) => {
        const startDate = row.getValue("startDate") as Date;
        return startDate ? format(new Date(startDate), "dd MMM yyyy") : "N/A";
      },
    },
    {
      accessorKey: "endDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="End Date" />
      ),
      cell: ({ row }) => {
        const endDate = row.getValue("endDate") as Date;
        return endDate ? format(new Date(endDate), "dd MMM yyyy") : "N/A";
      },
    },
    {
      accessorKey: "remainingSessions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Remaining Sessions" />
      ),
      cell: ({ row }) => {
        const remaining = row.original.remainingSessions;
        return <span>{remaining ?? "N/A"}</span>;
      },
    },
    {
      accessorKey: "salesPerson",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sales Name" />
      ),
      cell: ({ row }) => {
        const salesName = getSalesPersonName(
          row.original.salesId,
          row.original.salesType
        );
        return <span>{salesName}</span>;
      },
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditSales(row.original)}
          >
            <Edit className="h-4 w-4" />
            Edit Sales
          </Button>
        );
      },
    },
  ];

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const handleSearch = (value: string, column: string) => {
    setSearch(value);
    setSearchColumn(column);
    setPage(1);
  };

  return (
    <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Subscription History</h2>
          <p className="text-muted-foreground">
            View all subscription history with detailed member and package information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={subscriptions ?? { items: [], total: 0, page: 1, limit: 10 }}
            searchColumns={[
              { id: "member.user.name", placeholder: "Search by member name..." },
              { id: "package.name", placeholder: "Search by package name..." },
            ]}
            isLoading={isLoading}
            onPaginationChange={handlePaginationChange}
            onSearch={handleSearch}
          />
        </CardContent>
      </Card>

      {/* Edit Sales Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Sales Information</DialogTitle>
            <DialogDescription>
              Update the sales person assigned to this subscription.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sales-type">Sales Type</Label>
              <Select
                value={selectedSalesType}
                onValueChange={setSelectedSalesType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sales type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  <SelectItem value="PersonalTrainer">Personal Trainer</SelectItem>
                  <SelectItem value="FC">Fitness Consultant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sales-person">Sales Person</Label>
              <Select
                value={selectedSalesId}
                onValueChange={setSelectedSalesId}
                disabled={!selectedSalesType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sales person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not assigned</SelectItem>
                  {salesList
                    ?.filter(sales => sales.type === selectedSalesType)
                    .map((sales) => (
                      <SelectItem key={sales.id} value={sales.id}>
                        {sales.name} ({sales.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateSalesMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSales}
              disabled={updateSalesMutation.isPending}
            >
              {updateSalesMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}