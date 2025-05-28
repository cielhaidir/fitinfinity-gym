"use client";

import { Button } from "@/components/ui/button"
import { api } from "@/trpc/react"
import Link from "next/link"
import { useEffect, useState, use } from "react";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "../columns";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";


export default function SubscriptionPage({ params }: { params: Promise<{ memberID: string }> }) {

    const { memberID } = use(params);
    const utils = api.useUtils();
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { data: member, isLoading: memberIsLoading, error: memberError } = api.member.detail.useQuery({ id: memberID });
    const { data: subs = { items: [], total: 0, page: 1, limit: 10 }, isLoading, error, refetch } = api.subs.getByIdMember.useQuery(
        { memberId: memberID, page, limit }
    );

    const handlePaginationChange = (newPage: number, newLimit: number) => {
        setPage(newPage);
        setLimit(newLimit);
    };

    const directToSubs = (memberID: String) => {
        router.push(`/checkout/${memberID}`);  // Make sure this matches your folder structure
    };

    const columns = createColumns({});

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return (
            <div className="container mx-auto py-10">
                <h1 className="text-2xl font-bold mb-5">Error</h1>
                <p className="mb-5">{error.message}</p>
                <Link href="/management/member">
                    <Button variant="outline">Back to Members</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-5">
            <Link href="/management/member">
                <Button variant="outline">Back to Members</Button>
            </Link>
            <div className="flex items-center justify-between space-y-2">
                <div>

                    <h2 className="text-2xl font-bold mt-5">{member?.user?.name}'s Subscriptions</h2>
                    <p className="text-muted-foreground">
                        Here&apos;s a list of history subscription
                    </p>
                </div>
                <Button className="mb-4 bg-infinity" onClick={() => directToSubs(memberID)}>
                    <Plus className="mr-2 h-4 w-4" /> New Subscription
                </Button>
            </div>
            <div className="mb-5">
                <DataTable
                    data={subs}
                    columns={columns}
                    onPaginationChange={handlePaginationChange}
                />
            </div>
           
        </div>
    )
}
