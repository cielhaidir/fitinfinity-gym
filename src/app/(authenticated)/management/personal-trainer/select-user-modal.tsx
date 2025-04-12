"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/datatable/data-table";
import { api } from "@/trpc/react";
import { User } from "@prisma/client";

type SelectUserModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSelectUser: (user: User) => void;
    onAddNew: () => void;
};

export const SelectUserModal = ({ isOpen, onClose, onSelectUser, onAddNew }: SelectUserModalProps) => {
    const [search, setSearch] = useState("");
    const [searchColumn, setSearchColumn] = useState<string>("");

    const { data: users = { items: [], total: 0, page: 1, limit: 10 } } = api.user.list.useQuery({
        page: 1,
        limit: 10,
        search,
        searchColumn,
    });

    const columns = [
        {
            accessorKey: "name",
            header: "Name",
        },
        {
            accessorKey: "email",
            header: "Email",
        },
        {
            id: "actions",
            cell: ({ row }: { row: { original: User } }) => (
                <Button
                    variant="outline"
                    onClick={() => onSelectUser(row.original)}
                >
                    Select
                </Button>
            ),
        },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Select Existing User</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <DataTable
                        data={{
                            items: users.items,
                            total: users.total,
                            page: users.page,
                            limit: users.limit,
                        }}
                        columns={columns}
                        searchColumns={[
                            { id: "name", placeholder: "Search by name..." },
                            { id: "email", placeholder: "Search by email..." },
                        ]}
                        onSearch={(value, column) => {
                            setSearch(value);
                            setSearchColumn(column);
                        }}
                    />
                </div>
                <div className="flex justify-end mt-4">
                    <Button 
                        variant="outline" 
                        onClick={onAddNew}
                        className="mr-2"
                    >
                        + Add New User
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}; 