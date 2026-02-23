"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/_components/ui/dialog";
import { Textarea } from "@/app/_components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/app/_components/ui/radio-group";
import { Label } from "@/app/_components/ui/label";
import { Card, CardContent } from "@/app/_components/ui/card";

import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { api } from "@/trpc/react";
import { type Member, type UserMember } from "./schema";
import { MemberForm } from "./member-form";
import { MemberNewMemberForm } from "./member-new-member-form";
import { toast } from "sonner";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

function generateRandomPassword(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function formatFacilityDescription(lokerSelection: string, lokerNumber: string, handuk: string): string {
  const parts: string[] = [];
  
  if (lokerSelection === "Number" && lokerNumber.trim()) {
    parts.push(`Loker = ${lokerNumber.trim()}`);
  }
  
  if (handuk !== "None") {
    parts.push(`Handuk = ${handuk}`);
  }
  
  return parts.length > 0 ? parts.join(", ") : "";
}

export default function MemberPage() {
  const utils = api.useUtils();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<UserMember | null>(null);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showForm, setShowForm] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [facilityDescription, setFacilityDescription] = useState("");
  const [lokerSelection, setLokerSelection] = useState<string>("None");
  const [lokerNumber, setLokerNumber] = useState<string>("");
  const [handukSelection, setHandukSelection] = useState<string>("None");
  const [selectedMemberForCheckIn, setSelectedMemberForCheckIn] = useState<Member | null>(null);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [selectedMemberForFreeze, setSelectedMemberForFreeze] = useState<Member | null>(null);
  const [freezeDaysInput, setFreezeDaysInput] = useState<string>("");
  const [selectedFreezeOption, setSelectedFreezeOption] = useState<string>("custom");
  const [selectedFreezePriceId, setSelectedFreezePriceId] = useState<string | null>(null);
  const [selectedBalanceAccountId, setSelectedBalanceAccountId] = useState<number | null>(null);
  const [freezeStartAt, setFreezeStartAt] = useState<string>("");

  const isSelectingForSubscription =
    searchParams.get("action") === "select-for-subscription";

  const { data: member = { items: [], total: 0, page: 1, limit: 10 }, isLoading } =
    api.member.list.useQuery({
      page,
      limit,
      search,
      searchColumn,
    });

  // Fetch active freeze prices
  const { data: freezePrices = [], isLoading: isLoadingFreezePrices } =
    api.freezePrice.getActive.useQuery();

  // Fetch balance accounts
  const { data: balanceAccountsData, isLoading: isLoadingBalanceAccounts } =
    api.balanceAccount.getAll.useQuery({
      page: 1,
      limit: 100,
    });

  const balanceAccounts = balanceAccountsData?.items ?? [];

  // Get users with memberships to exclude them from search
  const usersWithMemberships = useMemo(() =>
    member.items.map(memberItem => memberItem.userId),
    [member.items]
  );


  console.log("Member data:", member);


  const manualCheckInMutation = api.esp32.manualCheckIn.useMutation({
    onSuccess: () => {
      toast.success("Member checked in successfully");
      setIsCheckInModalOpen(false);
      setFacilityDescription("");
      setLokerSelection("None");
      setLokerNumber("");
      setHandukSelection("None");
      setSelectedMemberForCheckIn(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMemberMutation = api.member.update.useMutation({
    onSuccess: () => {
      utils.member.list.invalidate();
      setIsSheetOpen(false);
      setSelectedMember(null);
      toast.success("Member updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createUserMutation = api.user.create.useMutation({
    onSuccess: () => {
      utils.member.list.invalidate();
      setIsSheetOpen(false);
      setSelectedMember(null);
      toast.success("Member created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Subscription update mutation for fixing TypeScript error
  const updateSubsMutation = api.subs.update.useMutation();

  const freezeSubscriptionMutation = api.subs.freeze.useMutation({
    onSuccess: () => {
      utils.member.list.invalidate();
      setFreezeModalOpen(false);
      setSelectedMemberForFreeze(null);
      setFreezeDaysInput("");
      toast.success("Subscription frozen successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unfreezeSubscriptionMutation = api.subs.unfreeze.useMutation({
    onSuccess: () => {
      utils.member.list.invalidate();
      toast.success("Subscription unfrozen successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedMember) {
      const { name, value } = e.target;
      let parsedValue: any = value;
      // Handle date fields
      if (
        name === "registerDate" ||
        name === "subscriptionStartDate" ||
        name === "subscriptionEndDate"
      ) {
        parsedValue = value ? new Date(value) : null;
      }
      setSelectedMember({
        ...selectedMember,
        id: selectedMember.id,
        [name]: parsedValue === "" ? null : parsedValue,
      });
    }
  };

  const handleScanRFID = () => {
    console.log("Scanning RFID...");
  };

  const handleUpdateMember = async () => {
    if (!selectedMember?.id) return;

    try {
      const updateData = {
        id: selectedMember.id,
        rfidNumber: selectedMember.rfidNumber || undefined,
        registerDate: selectedMember.registerDate || undefined,
        fc: selectedMember.fcId
          ? {
              connect: { id: selectedMember.fcId },
            }
          : {
              disconnect: true,
            },
        personalTrainer: selectedMember.personalTrainerId
          ? {
              connect: { id: selectedMember.personalTrainerId },
            }
          : {
              disconnect: true,
            },
        user: {
          name: selectedMember.name || "",
          email: selectedMember.email || "",
          address: selectedMember.address || undefined,
          phone: selectedMember.phone || undefined,
          birthDate: selectedMember.birthDate || undefined,
          idNumber: selectedMember.idNumber || undefined,
        },
      };

      await updateMemberMutation.mutateAsync(updateData);

      // Update subscription dates if present
      if (
        selectedMember.subscriptionStartDate ||
        selectedMember.subscriptionEndDate
      ) {
        // Find the latest active subscription
        const memberDetail = member.items.find((m) => m.id === selectedMember.id);
        const subscriptionId = memberDetail?.subscriptions?.[0]?.id;
        if (subscriptionId) {
          await updateSubsMutation.mutateAsync({
            id: subscriptionId,
            startDate: selectedMember.subscriptionStartDate || undefined,
            endDate: selectedMember.subscriptionEndDate || undefined,
          });
        }
      }

      toast.success("Member updated successfully");
      setSelectedMember(null);
      setShowForm(false);
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
    }
  };

  const handleCreateMember = async (form: any) => {
    setAddMemberLoading(true);
    setAddMemberError(null);
    try {
      const randomPassword = generateRandomPassword();
      const createData = {
        name: form.name,
        email: form.email,
        password: randomPassword,
        address: form.address || undefined,
        phone: form.phone || undefined,
        birthDate: form.birthDate || undefined,
        fcId: form.fcId ?? null,
        rfidNumber: form.rfidNumber || undefined,
        personalTrainerId: form.personalTrainerId ?? null,
        idNumber: form.idNumber || undefined,
      };
      await createUserMutation.mutateAsync(createData);
      setShowForm(false);
      setIsSheetOpen(false);
    } catch (error: any) {
      setAddMemberError(error?.message || "Gagal menambah member");
      toast.error("Failed to create member");
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleAddMember = () => {
    setSelectedMember({
      id: "",
      name: "",
      email: "",
      rfidNumber: "",
      fcId: null,
      personalTrainerId: null,
      address: "",
      phone: "",
      birthDate: null,
      idNumber: "",
      registerDate: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
    });
    setShowForm(true);
    setIsSheetOpen(true);
    setIsAddMode(true);
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember({
      id: member.id,
      name: member.user.name ?? "",
      email: member.user.email ?? "",
      rfidNumber: member.rfidNumber ?? "",
      fcId: member.fc?.id ?? null,
      personalTrainerId: member.subscriptions[0]?.trainer?.id ?? "",
      address: member.user.address ?? "",
      phone: member.user.phone ?? "",
      birthDate: member.user.birthDate ?? null,
      idNumber: member.user.idNumber ?? "",
      registerDate: member.registerDate ?? null,
      subscriptionStartDate: member.subscriptions[0]?.startDate ?? null,
      subscriptionEndDate: member.subscriptions[0]?.endDate ?? null,
    });
    setShowForm(true);
    setIsSheetOpen(true);
    setIsAddMode(false);
  };

  const deleteMemberMutation = api.member.remove.useMutation({
    onSuccess: () => {
      utils.member.list.invalidate();
      toast.success("Member deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDeleteMember = async (member: Member) => {
    try {
      await deleteMemberMutation.mutateAsync({ id: member.id });
    } catch (error) {
      console.error("Error deleting member:", error);
    }
  };

  const handlePaginationChange = (newPage: number, newLimit: number) => {
    setPage(newPage);
    setLimit(newLimit);
  };

  const directToSubs = (member: Member) => {
    router.push(`/checkout/${member.userId}`);
  };

  const directToLogs = (member: Member) => {
    router.push(`/management/access-log/${member.id}`);
  };

  const directToProfile = (member: Member) => {
    router.push(`/member/profile?memberId=${member.id}`);
  };

  const handleManualCheckIn = (member: Member) => {
    setSelectedMemberForCheckIn(member);
    setIsCheckInModalOpen(true);
  };

  const handleFreezeSubscription = async (member: Member) => {
    setSelectedMemberForFreeze(member);
    setFreezeModalOpen(true);
  };
  
  const handleConfirmFreeze = async () => {
    if (!selectedMemberForFreeze) return;

    // Validate selection
    if (selectedFreezeOption === "custom") {
      if (freezeDaysInput.trim() === "") {
        toast.error("Please enter freeze days or select a freeze price option");
        return;
      }
    } else if (!selectedFreezePriceId) {
      toast.error("Please select a freeze price option");
      return;
    }

    // Validate balance account for paid freeze
    if (selectedFreezeOption !== "custom") {
      const selectedPrice = freezePrices.find(p => p.id === selectedFreezePriceId);
      if (selectedPrice && selectedPrice.price > 0 && !selectedBalanceAccountId) {
        toast.error("Silakan pilih akun kas untuk freeze berbayar");
        return;
      }
    }

    try {
      // Resolve freezeStartAt: use provided value or leave undefined (backend defaults to now)
      const freezeStartAtValue = freezeStartAt.trim()
        ? new Date(freezeStartAt).toISOString()
        : undefined;

      if (selectedFreezeOption === "custom") {
        // Free custom freeze - pass freezeDays directly
        const freezeDays = parseInt(freezeDaysInput);
        await freezeSubscriptionMutation.mutateAsync({
          memberId: selectedMemberForFreeze.id,
          freezeDays,
          freezeStartAt: freezeStartAtValue,
        });
      } else {
        // Paid freeze - pass freezePriceId and balanceAccountId
        await freezeSubscriptionMutation.mutateAsync({
          memberId: selectedMemberForFreeze.id,
          freezePriceId: selectedFreezePriceId,
          balanceAccountId: selectedBalanceAccountId ?? undefined,
          freezeStartAt: freezeStartAtValue,
        });
      }
    } catch (error) {
      console.error("Error freezing subscription:", error);
    }
  };

  const handleCancelFreeze = () => {
    setFreezeModalOpen(false);
    setSelectedMemberForFreeze(null);
    setFreezeDaysInput("");
    setSelectedFreezeOption("custom");
    setSelectedFreezePriceId(null);
    setSelectedBalanceAccountId(null);
    setFreezeStartAt("");
  };

  const handleUnfreezeSubscription = async (member: Member) => {
    try {
      await unfreezeSubscriptionMutation.mutateAsync({ memberId: member.id });
    } catch (error) {
      console.error("Error unfreezing subscription:", error);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!selectedMemberForCheckIn) return;

    const formattedDescription = formatFacilityDescription(lokerSelection, lokerNumber, handukSelection);

    try {
      await manualCheckInMutation.mutateAsync({
        memberId: selectedMemberForCheckIn.id,
        facilityDescription: formattedDescription || undefined,
        // timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error during manual check-in:", error);
    }
  };

  const handleCancelCheckIn = () => {
    setIsCheckInModalOpen(false);
    setFacilityDescription("");
    setLokerSelection("None");
    setLokerNumber("");
    setHandukSelection("None");
    setSelectedMemberForCheckIn(null);
  };


  const getCustomActions = (member: Member) => {
    const baseActions = [
      { label: "Profile", action: directToProfile },
      { label: "Subscription", action: directToSubs },
      { label: "Access Log", action: directToLogs },
      { label: "Check In Manually", action: handleManualCheckIn },
      { label: "Transfer Subscriptions", action: () => router.push("/admin/subscription-history") },
    ];

    // Check if member has any active subscriptions
    const hasActiveSubscriptions = member.subscriptions?.some(sub => sub.isActive && !sub.isFrozen);
    const hasFrozenSubscriptions = member.subscriptions?.some(sub => sub.isFrozen);

    // Show Freeze option if there are active (non-frozen) subscriptions
    if (hasActiveSubscriptions) {
      baseActions.push({ label: "Freeze All", action: handleFreezeSubscription });
    }

    // Show Unfreeze option if there are frozen subscriptions
    if (hasFrozenSubscriptions) {
      baseActions.push({ label: "Unfreeze All", action: handleUnfreezeSubscription });
    }

    return baseActions;
  };

  const handleMemberSelect = (member: Member) => {
    if (isSelectingForSubscription) {
      router.push(`/checkout/${member.id}`);
    }
  };

  const columns = createColumns({
    onEditMember: handleEditMember,
    onDeleteMember: handleDeleteMember,
    customActions: isSelectingForSubscription ? [] : undefined,
    getCustomActions: isSelectingForSubscription ? undefined : getCustomActions,
  });

  return (
    <ProtectedRoute requiredPermissions={["menu:member"]}>
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setSelectedMember(null);
            setShowForm(false);
            setIsAddMode(false);
          }
        }}
      >
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
          <div className="flex items-center justify-between space-y-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Membership Management
              </h2>
              <p className="text-muted-foreground">
                Here&apos;s a list of Fit Infinity Member!
              </p>
            </div>
            <Button className="bg-infinity" onClick={handleAddMember}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Member
            </Button>
          </div>
          {isSelectingForSubscription && (
            <div className="mb-4">
              <h2 className="text-2xl font-bold">
                Select Member for New Subscription
              </h2>
              <p className="text-muted-foreground">
                Click on a member to create a new subscription
              </p>
            </div>
          )}
          {showForm && isAddMode && (
            <MemberNewMemberForm
              onSubmit={handleCreateMember}
              onCancel={() => {
                setShowForm(false);
                setIsSheetOpen(false);
                setIsAddMode(false);
              }}
              loading={addMemberLoading}
              error={addMemberError || ""}
            />
          )}
          {showForm && !isAddMode && selectedMember && (
            <MemberForm
              newMember={selectedMember}
              onInputChange={handleInputChange}
              onUpdate={handleUpdateMember}
              onCancel={() => {
                setSelectedMember(null);
                setShowForm(false);
                setIsSheetOpen(false);
                setIsAddMode(false);
              }}
            />
          )}
          <DataTable
            data={member}
            columns={columns}
            isLoading={isLoading}
            onPaginationChange={handlePaginationChange}
            searchColumns={[
              { id: "rfidNumber", placeholder: "Search by RFID..." },
              { id: "user.name", placeholder: "Search by name..." },
              { id: "user.email", placeholder: "Search by email..." },
            ]}
            onSearch={(value, column) => {
              console.log("FRONTEND SEARCH:", { value, column });
              setSearch(value);
              setSearchColumn(column);
            }}
          />
        </div>
      </Sheet>

      {/* Freeze Modal */}
      <Dialog open={freezeModalOpen} onOpenChange={setFreezeModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Freeze Member Subscriptions</DialogTitle>
            <DialogDescription>
              {selectedMemberForFreeze && (
                <>
                  Freeze all active subscriptions for <strong>{selectedMemberForFreeze.user.name}</strong>.
                  Select a freeze price option or choose custom freeze.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isLoadingFreezePrices ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Loading freeze prices...</p>
              </div>
            ) : (
              <RadioGroup value={selectedFreezeOption} onValueChange={(value) => {
                setSelectedFreezeOption(value);
                if (value === "custom") {
                  setSelectedFreezePriceId(null);
                } else {
                  setSelectedFreezePriceId(value);
                  setFreezeDaysInput("");
                }
              }}>
                <div className="space-y-3">
                  {/* Free Custom Freeze Option */}
                  <Card className={selectedFreezeOption === "custom" ? "border-infinity border-2" : ""}>
                    <CardContent className="flex items-start space-x-4 p-4">
                      <RadioGroupItem value="custom" id="freeze-custom" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="freeze-custom" className="font-semibold cursor-pointer">
                          Free Custom Freeze
                        </Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Enter custom number of freeze days (free of charge)
                        </p>
                        {selectedFreezeOption === "custom" && (
                          <div className="mt-2">
                            <Input
                              type="number"
                              placeholder="Enter number of days"
                              value={freezeDaysInput}
                              onChange={(e) => setFreezeDaysInput(e.target.value)}
                              min="1"
                              max="365"
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Enter days (1-365) or leave empty for indefinite freeze
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">FREE</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Freeze Price Options */}
                  {freezePrices.length > 0 ? (
                    freezePrices.map((price) => (
                      <Card
                        key={price.id}
                        className={selectedFreezeOption === price.id ? "border-infinity border-2" : ""}
                      >
                        <CardContent className="flex items-start space-x-4 p-4">
                          <RadioGroupItem value={price.id} id={`freeze-${price.id}`} className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor={`freeze-${price.id}`} className="font-semibold cursor-pointer">
                              {price.freezeDays} Days Freeze
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Freeze subscription for {price.freezeDays} days
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-infinity">
                              {new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0,
                              }).format(price.price)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground text-center">
                          No freeze price options available. Use custom freeze instead.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </RadioGroup>
            )}

            {/* Freeze Start At - date picker */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="freeze-start-at" className="text-sm font-medium">
                Freeze Start Date <span className="text-muted-foreground text-xs">(optional, defaults to today)</span>
              </Label>
              <Input
                id="freeze-start-at"
                type="date"
                value={freezeStartAt}
                onChange={(e) => setFreezeStartAt(e.target.value)}
                className="w-full"
              />
              {freezeStartAt && (
                <p className="text-xs text-muted-foreground">
                  Subscription will be marked as frozen starting{" "}
                  <strong>{new Date(freezeStartAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong>
                </p>
              )}
            </div>

            {/* Balance Account Selection - only show for paid freeze options */}
            {selectedFreezeOption !== "custom" && selectedFreezePriceId && (
              (() => {
                const selectedPrice = freezePrices.find(p => p.id === selectedFreezePriceId);
                const isPaidFreeze = selectedPrice && selectedPrice.price > 0;
                
                return isPaidFreeze ? (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="balance-account" className="text-sm font-medium">
                      Akun Kas / Balance Account <span className="text-red-500">*</span>
                    </Label>
                    {isLoadingBalanceAccounts ? (
                      <div className="text-sm text-muted-foreground">Loading balance accounts...</div>
                    ) : (
                      <>
                        <Select
                          value={selectedBalanceAccountId?.toString() ?? ""}
                          onValueChange={(value) => setSelectedBalanceAccountId(value ? parseInt(value) : null)}
                        >
                          <SelectTrigger id="balance-account">
                            <SelectValue placeholder="Pilih akun kas" />
                          </SelectTrigger>
                          <SelectContent>
                            {balanceAccounts.length > 0 ? (
                              balanceAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id.toString()}>
                                  {account.name} ({account.account_number})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-accounts" disabled>
                                No balance accounts available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Pilih akun kas untuk mencatat pembayaran freeze
                        </p>
                      </>
                    )}
                  </div>
                ) : null;
              })()
            )}

            {/* Show selected price summary */}
            {selectedFreezeOption !== "custom" && selectedFreezePriceId && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Selected:</p>
                    <p className="text-sm text-muted-foreground">
                      {freezePrices.find(p => p.id === selectedFreezePriceId)?.freezeDays} Days Freeze
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Price:</p>
                    <p className="text-xl font-bold text-infinity">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0,
                      }).format(freezePrices.find(p => p.id === selectedFreezePriceId)?.price ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelFreeze}
              disabled={freezeSubscriptionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmFreeze}
              disabled={freezeSubscriptionMutation.isPending}
              className="bg-infinity"
            >
              {freezeSubscriptionMutation.isPending ? "Freezing..." : "Confirm Freeze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-in Modal */}
      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manual Check-in</DialogTitle>
            <DialogDescription>
              {selectedMemberForCheckIn && (
                <>
                  Check in <strong>{selectedMemberForCheckIn.user.name}</strong> manually.
                  Please specify which facility they are using (optional).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Facility Usage
              </label>
              <div className="space-y-3">
                <div className="grid gap-2">
                  <label htmlFor="loker" className="text-sm">
                    Loker
                  </label>
                  <Select value={lokerSelection} onValueChange={setLokerSelection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select loker option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Number">Number</SelectItem>
                    </SelectContent>
                  </Select>
                  {lokerSelection === "Number" && (
                    <Input
                      type="number"
                      placeholder="Enter loker number"
                      value={lokerNumber}
                      onChange={(e) => setLokerNumber(e.target.value)}
                      className="mt-2"
                      min="1"
                    />
                  )}
                </div>
                <div className="grid gap-2">
                  <label htmlFor="handuk" className="text-sm">
                    Handuk
                  </label>
                  <Select value={handukSelection} onValueChange={setHandukSelection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select handuk option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Besar">Besar</SelectItem>
                      <SelectItem value="Kecil">Kecil</SelectItem>
                      <SelectItem value="Keduanya">Keduanya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelCheckIn}
              disabled={manualCheckInMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCheckIn}
              disabled={manualCheckInMutation.isPending}
              className="bg-infinity"
            >
              {manualCheckInMutation.isPending ? "Checking in..." : "Check In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
