"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/datatable/data-table";
import { api } from "@/trpc/react";
import { type User } from "@prisma/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

type SelectUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
  onAddNew: () => void;
};

export const SelectUserModal = ({
  isOpen,
  onClose,
  onSelectUser,
  onAddNew,
}: SelectUserModalProps) => {
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [showReferralModal, setShowReferralModal] = useState(false);
  const utils = api.useUtils();

  const createEmployeeMutation = api.employee.create.useMutation({
    onSuccess: () => {
      toast.success("Employee record created successfully");
      utils.employee.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Error creating employee: ${error.message}`);
      console.error("Employee creation error:", error);
    },
  });

  const createFCMutation = api.fc.create.useMutation({
    onSuccess: () => {
      toast.success("FC created successfully");
      utils.fc.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Error creating FC: ${error.message}`);
      console.error("FC creation error:", error);
    },
  });

  const handleUserSelect = async (user: User) => {
    setSelectedUser(user);
    setShowReferralModal(true);
  };

  const handleConfirmSelection = async () => {
    if (!selectedUser) return;

    if (!referralCode || referralCode.length < 5) {
      toast.error("Referral code must be at least 5 characters");
      return;
    }

    try {
      let employeeCreated = false;

      try {
        await createEmployeeMutation.mutateAsync({
          id: selectedUser.id,
          userId: selectedUser.id,
          position: "Fitness Consultant",
          department: "Sales",
          isActive: true,
          image: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          user: selectedUser,
        });
        employeeCreated = true;
      } catch (employeeError: any) {
        if (!employeeError.message.includes("Unique constraint")) {
          throw employeeError;
        }
        employeeCreated = true;
      }

      if (employeeCreated) {
        try {
          await createFCMutation.mutateAsync({
            userId: selectedUser.id,
            isActive: true,
            createdBy: selectedUser.id,
            referralCode: referralCode,
          });

          toast.success("Successfully created FC");
          await utils.fc.list.invalidate();
          await utils.employee.list.invalidate();
          handleClose();
        } catch (fcError: any) {
          console.error("FC creation error:", fcError);
          if (fcError.message.includes("Unique constraint")) {
            toast.error(
              "This user is already a FC or referral code is already taken",
            );
          } else {
            toast.error("Failed to create FC: " + fcError.message);
          }
        }
      }
    } catch (error: any) {
      console.error("Error in handleConfirmSelection:", error);
      toast.error("Failed to process: " + error.message);
    }
  };

  const handleClose = () => {
    setSelectedUser(null);
    setReferralCode("");
    setShowReferralModal(false);
    onClose();
  };

  const { data: users = { items: [], total: 0, page: 1, limit: 10 } } =
    api.user.list.useQuery(
      {
        page,
        limit,
        search,
        searchColumn,
      },
      {
        keepPreviousData: true,
      },
    );

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

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
      cell: ({ row }: { row: { original: User } }) => {
        return (
          <Button
            variant="outline"
            onClick={() => handleUserSelect(row.original)}
          >
            Select
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Dialog open={isOpen && !showReferralModal} onOpenChange={handleClose}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Select User</DialogTitle>
          </DialogHeader>
          <div className="py-2">
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
                setPage(1);
              }}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={onAddNew} className="mr-2">
              + Add New User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showReferralModal}
        onOpenChange={() => setShowReferralModal(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Referral Code</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="referralCode"
                  className="mb-2 block text-sm font-medium"
                >
                  Referral Code (min. 5 characters)
                </label>
                <Input
                  id="referralCode"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter referral code"
                  minLength={5}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowReferralModal(false);
                setSelectedUser(null);
                setReferralCode("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmSelection} className="bg-infinity">
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
