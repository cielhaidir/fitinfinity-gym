"use client";

import React, { useState } from 'react';
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from './columns';
import { Receipt, Users, Package } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function FinanceDashboardPage() {
    const { data: session } = useSession();
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    // Query untuk mendapatkan data transaksi
    const { data: transactions, isLoading } = api.paymentValidation.listAll.useQuery(
        { page, limit },
        {
            enabled: !!session,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
            staleTime: 0,
        }
    );

    const openImageModal = (imageUrl: string) => {
        if (!imageUrl) {
            return;
        }
        setSelectedImageUrl(imageUrl);
        setIsImageModalOpen(true);
    };

    const columns = createColumns({
        onViewProof: openImageModal,
    });

    const handlePaginationChange = (newPage: number, newLimit: number) => {
        setPage(newPage);
        setLimit(newLimit);
    };

    return (
        <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Finance Dashboard</h2>
                    <p className="text-muted-foreground">
                        Overview of recent transactions and financial metrics
                    </p>
                </div>
            </div>

            {/* Cards Section */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Transactions
                        </CardTitle>
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{transactions?.total ?? 0}</div>
                        <p className="text-xs text-muted-foreground">
                            All time transactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Members
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(transactions?.items.map(t => t.member?.user?.email)).size ?? 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Members with transactions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Packages
                        </CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(transactions?.items.map(t => t.package?.name)).size ?? 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Different package types sold
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Transactions Table */}
            <div className="rounded-md border">
                <DataTable
                    columns={columns}
                    data={transactions ?? { items: [], total: 0, page: 1, limit: 10 }}
                    searchColumns={[
                        { id: "member.user.name", placeholder: "Search by member name..." },
                        { id: "package.name", placeholder: "Search by package..." },
                    ]}
                    isLoading={isLoading}
                    onPaginationChange={handlePaginationChange}
                />
            </div>

            {/* Image Preview Modal */}
            <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Payment Proof</DialogTitle>
                        <DialogDescription>
                            Review the uploaded payment proof below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex justify-center">
                        {selectedImageUrl ? (
                            <Link href={selectedImageUrl} target="_blank" rel="noopener noreferrer">
                                <Image 
                                    src={selectedImageUrl} 
                                    alt="Payment Proof" 
                                    width={500} 
                                    height={700} 
                                    style={{ objectFit: 'contain', maxHeight: '70vh' }}
                                    onError={(e) => { 
                                        console.error("Error loading image:", e); 
                                        (e.target as HTMLImageElement).src = '/placeholder-error.png';
                                        (e.target as HTMLImageElement).alt = 'Error loading image';
                                    }}
                                />
                            </Link>
                        ) : (
                            <p>No image to display or image URL is invalid.</p>
                        )}
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsImageModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
