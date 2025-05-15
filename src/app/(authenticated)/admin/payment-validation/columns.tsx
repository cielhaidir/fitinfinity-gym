"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, CheckCircle, XCircle, MoreHorizontal } from "lucide-react";
import { PaymentValidationItem } from "./page"; // Import the type from page.tsx
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface CreateColumnsProps {
    onAccept: (id: string) => void;
    onDecline: (id: string) => void;
    onViewProof: (filePath: string) => void;
    isAccepting: boolean;
    isDeclining: boolean;
}

export const createColumns = ({
    onAccept,
    onDecline,
    onViewProof,
    isAccepting,
    isDeclining,
}: CreateColumnsProps): ColumnDef<PaymentValidationItem>[] => [
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Checkout Date" />,
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
    {
        id: "actions",
        cell: ({ row }) => {
            const validation = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onViewProof(validation.filePath!)} disabled={!validation.filePath}>
                            <Eye className="mr-2 h-4 w-4" /> View Proof
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            onClick={() => onAccept(validation.id)} 
                            disabled={isAccepting || isDeclining}
                            className="text-green-600 focus:text-green-700 focus:bg-green-50"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" /> Accept
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => onDecline(validation.id)} 
                            disabled={isAccepting || isDeclining}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                            <XCircle className="mr-2 h-4 w-4" /> Decline
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
        enableSorting: false,
        enableHiding: false,
    },
]; 