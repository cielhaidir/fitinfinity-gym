"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";

interface CreateColumnsProps {
    onViewProof: (filePath: string) => void;
}

export const createColumns = ({
    onViewProof,
}: CreateColumnsProps): ColumnDef<any>[] => [
    {
        accessorKey: "member.user.name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Member Name" />,
        cell: ({ row }) => {
            const memberName = row.original.member?.user?.name;
            const memberEmail = row.original.member?.user?.email;
            return (
                <div className="flex flex-col">
                    <span className="font-medium">{memberName || "N/A"}</span>
                    {memberEmail && <span className="text-xs text-muted-foreground">{memberEmail}</span>}
                </div>
            );
        },
    },
    {
        accessorKey: "package.name",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Package" />,
        cell: ({ row }) => {
            const packageName = row.original.package?.name;
            const trainerName = row.original.trainer?.user?.name;
            const subsType = row.original.subsType;
            return (
                <div className="flex flex-col">
                    <span>{packageName || "N/A"}</span>
                    {subsType === "trainer" && trainerName && (
                        <span className="text-xs text-muted-foreground">Trainer: {trainerName}</span>
                    )}
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
            const formatted = new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
            }).format(amount);
            return <div className="font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Transaction Date" />,
        cell: ({ row }) => {
            const date = new Date(row.getValue("createdAt"));
            return <span>{date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric'})}</span>;
        },
    },
    {
        accessorKey: "filePath",
        header: "Proof",
        cell: ({ row }) => {
            const filePath = row.original.filePath;
            if (!filePath) {
                return <span className="text-muted-foreground">No proof</span>;
            }
            return (
                <Button variant="outline" size="sm" onClick={() => onViewProof(filePath)}>
                    <Eye className="mr-2 h-4 w-4" /> View
                </Button>
            );
        },
    },
]; 