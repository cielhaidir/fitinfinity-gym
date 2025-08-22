"use client";

import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Camera, Package2, UserCog, Users } from "lucide-react";
import { ChangePasswordDialog } from "./change-password-dialog";
import { DataTable } from "@/components/datatable/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { useRBAC } from "@/hooks/useRBAC";

export default function ProfilePage() {
  const utils = api.useUtils();
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');
  const isViewingOtherMember = !!memberId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  
  // RBAC hooks
  const { hasPermission } = useRBAC();
  const canEditProfile = hasPermission("update:profile");
  const canManageMembers = hasPermission("update:member") || hasPermission("list:member");
  const isAdmin = canManageMembers; // Admin can edit any member profile
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    birthDate: "",
    image: "",
    height: "",
    weight: "",
    gender: "",
  });

  const { data: profile, isLoading } = api.profile.get.useQuery(
    memberId ? { memberId } : undefined,
    {
      enabled: !!session?.user.id,
    }
  );

  // Get subscription history for current member
  const { data: subscriptionHistory, isLoading: isLoadingHistory } = api.subs.getSubscriptionHistory.useQuery(
    {
      memberId: memberId || "",
      page: 1,
      limit: 10,
    },
    {
      enabled: !!memberId,
    }
  );

  // Debug logging
  console.log("Profile:", profile);
  console.log("Subscription History:", subscriptionHistory);
  console.log("Is Loading History:", isLoadingHistory);

  const updateProfile = api.profile.update.useMutation({
    onSuccess: async () => {
      await utils.profile.get.invalidate(); // Invalidate cached profile
      await update(); // Refresh session user
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      if (error.message.includes("phone")) {
        toast.error("Phone number is already registered");
      } else {
        toast.error(error.message);
      }
    },
  });

  // Admin-specific mutation for updating member profiles
  const updateMemberProfile = api.profile.updateMember.useMutation({
    onSuccess: async () => {
      await utils.profile.get.invalidate();
      toast.success("Member profile updated successfully");
      setIsEditing(false);
    },
    onError: (error: any) => {
      if (error.message.includes("phone")) {
        toast.error("Phone number is already registered");
      } else {
        toast.error(error.message);
      }
    },
  });

  // Account transfer mutation
  const transferAccount = api.profile.transferAccount.useMutation({
    onSuccess: () => {
      toast.success("Account transferred successfully");
      setShowTransferDialog(false);
      setTransferEmail("");
      router.push("/admin/member"); // Redirect to member list
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const { refetch: checkPhone } = api.profile.checkPhone.useQuery(
    { phone: formData.phone },
    { enabled: false }, // Disable automatic query
  );

  const uploadImage = api.profile.uploadImage.useMutation({
    onSuccess: (data) => {
      setFormData({ ...formData, image: data.imageUrl });
      toast.success("Profile image updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        birthDate: profile.birthDate
          ? format(profile.birthDate, "yyyy-MM-dd")
          : "",
        image: profile.image ?? "",
        height: profile.height?.toString() ?? "",
        weight: profile.weight?.toString() ?? "",
        gender: profile.gender ?? "",
      });
    }
  }, [profile]);

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number format
    if (formData.phone && formData.phone.length < 10) {
      toast.error("Phone number must be at least 10 digits");
      return;
    }

    // Validate if phone number is different from current user's phone
    if (formData.phone !== profile?.phone) {
      // Only check phone if it's not empty
      if (formData.phone && formData.phone.trim() !== "") {
        try {
          // Check if phone number is already registered
          const { data: phoneExists } = await checkPhone();
          if (phoneExists) {
            toast.error("Phone number is already registered");
            return;
          }
        } catch (error) {
          console.error("Phone check error:", error);
          return;
        }
      }
    }

    // If phone is not registered or hasn't changed, proceed with update
    const genderValue = ["MALE", "FEMALE", "OTHER"].includes(formData.gender)
      ? (formData.gender as "MALE" | "FEMALE" | "OTHER")
      : undefined;
    const data = {
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      image: formData.image,
      birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
      height: formData.height ? parseFloat(formData.height) : undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      gender: genderValue,
    };

    // Use appropriate mutation based on admin status and viewing mode
    if (isAdmin && isViewingOtherMember && memberId) {
      updateMemberProfile.mutate({ ...data, memberId });
    } else {
      updateProfile.mutate(data);
    }
  };

  const handleTransferAccount = () => {
    if (!transferEmail || !profile?.id) return;
    
    transferAccount.mutate({
      fromUserId: profile.id,
      toUserEmail: transferEmail,
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          console.log(
            "Uploading image...",
            base64String.substring(0, 100) + "...",
          ); // Log first 100 chars

          const result = await uploadImage.mutateAsync({ file: base64String });
          console.log("Upload result:", result);

          if (result.imageUrl) {
            setFormData((prev) => ({ ...prev, image: result.imageUrl }));
            toast.success("Profile image updated successfully");
          }
        } catch (error) {
          console.error("Upload error:", error);
          toast.error("Failed to upload image");
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File processing error:", error);
      toast.error("Failed to process image");
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove non-digits

    // Remove 62 prefix if it exists
    if (value.startsWith("62")) {
      value = value.substring(2);
    }

    // Add 62 prefix if not empty
    if (value) {
      value = "62" + value;
    }

    setFormData({ ...formData, phone: value });
  };

  // Mobile-friendly subscription history component
  const SubscriptionHistoryMobile = ({ subscriptions }: { subscriptions: any[] }) => (
    <div className="space-y-4 md:hidden">
      {subscriptions.map((subscription) => (
        <Card key={subscription.id} className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-[#BFFF00]">{subscription.package?.name || "N/A"}</h4>
                <p className="text-sm text-muted-foreground">
                  {subscription.trainer?.user?.name ? `Trainer: ${subscription.trainer.user.name}` : "No trainer"}
                </p>
                {subscription.salesPerson && (
                  <p className="text-sm text-muted-foreground">
                    Sales: {subscription.salesPerson.name} ({subscription.salesPerson.type === "PersonalTrainer" ? "PT" : "FC"})
                  </p>
                )}
              </div>
              <Badge variant={subscription.isActive ? "default" : "secondary"}>
                {subscription.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Start:</span>
                <p className="font-medium">
                  {subscription.startDate ? format(new Date(subscription.startDate), "dd MMM yyyy") : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">End:</span>
                <p className="font-medium">
                  {subscription.endDate ? format(new Date(subscription.endDate), "dd MMM yyyy") : "N/A"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Sessions:</span>
                <p className="font-medium">{subscription.remainingSessions }</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment:</span>
                <Badge
                  variant="default"
                  className="text-xs bg-green-600 hover:bg-green-700"
                >
                  SUCCESS
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  // Desktop subscription history columns - optimized for larger screens
  const subscriptionColumns: ColumnDef<any>[] = [
    {
      accessorKey: "package.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Package" />
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
        <DataTableColumnHeader column={column} title="Sessions" />
      ),
      cell: ({ row }) => {
        const remaining = row.original.remainingSessions;
        return <span>{remaining ?? 0}</span>;
      },
    },
    {
      accessorKey: "trainer",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Trainer" />
      ),
      cell: ({ row }) => {
        const trainer = row.original.trainer;
        return trainer?.user?.name ? (
          <span className="text-sm">{trainer.user.name}</span>
        ) : (
          <span className="text-muted-foreground text-sm">No trainer</span>
        );
      },
    },
    {
      accessorKey: "salesPerson",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sales" />
      ),
      cell: ({ row }) => {
        const salesPerson = row.original.salesPerson;
        return salesPerson ? (
          <div className="text-sm">
            <span className="font-medium">{salesPerson.name}</span>
            <span className="text-muted-foreground ml-1">
              ({salesPerson.type === "PersonalTrainer" ? "PT" : "FC"})
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">No sales</span>
        );
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
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-[#BFFF00]">
                <AvatarImage
                  src={formData.image || session.user.image || ""}
                  alt={profile?.name || "User"}
                />
                <AvatarFallback className="bg-[#BFFF00] font-semibold text-black">
                  {profile?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-background"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#BFFF00]">
                {profile?.name || "User"}
              </h2>
              <p className="text-muted-foreground">{profile?.email ?? session?.user?.email}</p>
            </div>
          </div>
       
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p>
                  {profile?.createdAt
                    ? format(profile.createdAt, "MMMM d, yyyy")
                    : "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Points</p>
                <p>{profile?.point || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Age</p>
                <p>
                  {profile?.birthDate
                    ? Math.floor(
                        (new Date().getTime() -
                          new Date(profile.birthDate).getTime()) /
                          (1000 * 60 * 60 * 24 * 365.25),
                      )
                    : "N/A"}
                </p>
              </div>
            </div>

            <form
              id="profile-form"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={!isEditing || (isViewingOtherMember && !isAdmin)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    disabled={!isEditing || (isViewingOtherMember && !isAdmin)}
                    placeholder="62xxxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    disabled={!isEditing || (isViewingOtherMember && !isAdmin)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Birth Date</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                    disabled={!isEditing || (isViewingOtherMember && !isAdmin)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) =>
                      setFormData({ ...formData, height: e.target.value })
                    }
                    disabled={!isEditing || (isViewingOtherMember && !isAdmin)}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                    disabled={!isEditing || (isViewingOtherMember && !isAdmin)}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    disabled={!isEditing || (isViewingOtherMember && !isAdmin)}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </form>
            <ChangePasswordDialog isAdmin={isAdmin} memberId={isViewingOtherMember ? memberId : undefined} />
            
            {/* Profile editing buttons */}
            {!isEditing && ((!isViewingOtherMember) || (isViewingOtherMember && isAdmin)) ? (
              <div className="space-y-2">
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-[#C9D953] hover:bg-[#C9D953]/90 w-full md:w-auto"
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  {isViewingOtherMember ? "Edit Member Profile" : "Edit Profile"}
                </Button>
                
                {/* Admin-only transfer account button */}
                {/* {isAdmin && isViewingOtherMember && (
                  <Button
                    onClick={() => setShowTransferDialog(true)}
                    variant="outline"
                    className="w-full md:w-auto"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Transfer Account
                  </Button>
                )} */}
              </div>
            ) : isEditing ? (
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  form="profile-form"
                  type="submit"
                  disabled={updateProfile.isPending || updateMemberProfile.isPending}
                  className="bg-[#C9D953] hover:bg-[#C9D953]/90"
                >
                  {(updateProfile.isPending || updateMemberProfile.isPending) ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            ) : isViewingOtherMember && !isAdmin ? (
              <Button
                onClick={() => router.back()}
                variant="outline"
              >
                Back to Admin
              </Button>
            ) : null}

            {/* Account Transfer Dialog */}
            {showTransferDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Transfer Account</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Transfer this member's account credentials to another user by email.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="transferEmail">Target User Email</Label>
                      <Input
                        id="transferEmail"
                        type="email"
                        value={transferEmail}
                        onChange={(e) => setTransferEmail(e.target.value)}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowTransferDialog(false);
                          setTransferEmail("");
                        }}
                      >
                        Cancel
                      </Button>
                      {/* <Button
                        onClick={handleTransferAccount}
                        disabled={!transferEmail || transferAccount.isPending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {transferAccount.isPending ? "Transferring..." : "Transfer Account"}
                      </Button> */}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription History Section - Separate Card */}
      <Card className="mx-auto max-w-4xl mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl font-semibold text-[#BFFF00]">
            Subscription History
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your subscription history with successful payments
          </p>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#BFFF00] mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading subscription history...</p>
              </div>
            </div>
          ) : subscriptionHistory?.items && subscriptionHistory.items.length > 0 ? (
            <>
              {/* Mobile View */}
              <SubscriptionHistoryMobile subscriptions={subscriptionHistory.items} />
              
              {/* Desktop View */}
              <div className="hidden md:block">
                <DataTable
                  columns={subscriptionColumns}
                  data={subscriptionHistory ?? { items: [], total: 0, page: 1, limit: 10 }}
                  isLoading={isLoadingHistory}
                />
              </div>
              
              {/* Show total count */}
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Showing {subscriptionHistory.items.length} of {subscriptionHistory.total} subscriptions
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No subscription history</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                You haven't made any successful subscription purchases yet. Your subscription history will appear here once you complete a purchase.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
