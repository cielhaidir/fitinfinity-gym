"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { Subscription } from "./schema";
import { toast } from "sonner"
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function SubscriptionPage() {
    const utils = api.useUtils();
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [searchColumn, setSearchColumn] = useState<string>("");
    const [isSelectingMember, setIsSelectingMember] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");

    // Query for subscriptions
    const { data: subscriptionData = { items: [], total: 0, page: 1, limit: 10 } } = api.subs.list.useQuery({
        page: 1,
        limit: 10,
        search,
        searchColumn
    });

    // Query for members in modal
    const { data: members = { items: [] } } = api.member.list.useQuery({
        page: 1,
        limit: 50,
        search: memberSearch,
        searchColumn: "user.name"
    });

    const handlePaginationChange = (page: number, limit: number) => {
        utils.subs.list.invalidate({ page, limit });
    };

    // Function to view member's subscriptions
    const viewMemberSubscriptions = (memberId: string) => {
        router.push(`/management/subscription/${memberId}`);
    };

    const handleSelectMember = (memberId: string) => {
        setIsSelectingMember(false);
        router.push(`/checkout/${memberId}`);
    };

    const columns = createColumns({ 
        onViewMember: viewMemberSubscriptions,
    });

    return (
        <>
            <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            Subscription Management
                        </h2>
                        <p className="text-muted-foreground">
                            Here&apos;s a list of all member subscriptions
                        </p>
                    </div>
                    <Button 
                        className="mb-4 bg-infinity"
                        onClick={() => setIsSelectingMember(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Subscription
                    </Button>
                </div>
                <DataTable
                    data={subscriptionData}
                    columns={columns}
                    onPaginationChange={handlePaginationChange}
                    searchColumns={[
                        { id: "member.user.name", placeholder: "Search by member name..." },
                        { id: "package.name", placeholder: "Search by package..." },
                    ]}
                    onSearch={(value, column) => {
                        setSearch(value);
                        setSearchColumn(column);
                    }}
                />
            </div>

            <Dialog open={isSelectingMember} onOpenChange={setIsSelectingMember}>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>Select Member for New Subscription</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Search members..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="mb-4"
                        />
                        <div className="max-h-[400px] overflow-y-auto">
                            {members.items.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-lg dark:hover:text-gray-50 transition-colors"
                                    onClick={() => handleSelectMember(member.id)}
                                >
                                    <div>
                                        <div className="font-medium">{member.user?.name}</div>
                                        <div className="text-sm text-gray-500 dark:hover:text-gray-300">{member.user?.email}</div>
                                    </div>
                                    <div className="text-sm text-gray-500 dark:hover:text-gray-300">
                                        {member.rfidNumber}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
