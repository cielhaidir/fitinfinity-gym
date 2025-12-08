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
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { Camera, Package2, UserCog, Users, Calendar, Activity, TrendingUp, Clock, Download, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { ChangePasswordDialog } from "./change-password-dialog";
import { DataTable } from "@/components/datatable/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRBAC } from "@/hooks/useRBAC";
import { ProtectedRoute } from "@/app/_components/auth/protected-route";

export default function ProfilePage() {
  const utils = api.useUtils();
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');
  const isViewingOtherMember = !!memberId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrCodeRef = useRef<HTMLCanvasElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [isEditingPoints, setIsEditingPoints] = useState(false);
  const [pointsValue, setPointsValue] = useState("");
  
  // Check-in related state
  const [checkinStartDate, setCheckinStartDate] = useState<string>("");
  const [checkinEndDate, setCheckinEndDate] = useState<string>("");
  const [checkinPage, setCheckinPage] = useState<number>(1);
  const checkinLimit = 10;
  
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

  // Get check-in statistics
  const { data: checkinStats, isLoading: isLoadingCheckinStats } = api.esp32.getMemberCheckinStats.useQuery(
    memberId ? { memberId } : undefined,
    {
      enabled: !!session?.user.id,
    }
  );

  // Get check-in history
  const { data: checkinHistory, isLoading: isLoadingCheckinHistory, refetch: refetchCheckinHistory } = api.esp32.getMemberCheckinHistory.useQuery(
    {
      memberId: memberId || undefined,
      startDate: checkinStartDate || undefined,
      endDate: checkinEndDate || undefined,
      page: checkinPage,
      limit: checkinLimit,
    },
    {
      enabled: !!session?.user.id,
    }
  );



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

  // TODO: Implement api.profile.updatePoints mutation in src/server/api/routers/profile.ts
  // Expected signature:
  // updatePoints: permissionProtectedProcedure(["update:member"])
  //   .input(z.object({ memberId: z.string(), points: z.number().min(0) }))
  //   .mutation(async ({ ctx, input }) => { ... })
  
  // Points update mutation (placeholder - needs backend implementation)
  const updatePoints = api.profile.updatePoints?.useMutation({
    onSuccess: async () => {
      await utils.profile.get.invalidate();
      toast.success("Points updated successfully");
      setIsEditingPoints(false);
      setPointsValue("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update points");
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
      setPointsValue(profile.point?.toString() ?? "0");
    }
  }, [profile]);

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="mx-auto max-w-4xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#BFFF00] mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading profile...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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

  const handleUpdatePoints = () => {
    if (!memberId) return;
    
    const points = parseInt(pointsValue, 10);
    if (isNaN(points) || points < 0) {
      toast.error("Please enter a valid positive number");
      return;
    }

    // TODO: Remove this check once the backend mutation is implemented
    if (!updatePoints) {
      toast.error("Points update feature is not yet implemented in the backend");
      console.error("TODO: Implement api.profile.updatePoints mutation in src/server/api/routers/profile.ts");
      return;
    }

    updatePoints.mutate({
      memberId,
      points,
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
          // console.log(
          //   "Uploading image...",
          //   base64String.substring(0, 100) + "...",
          // ); // Log first 100 chars

          const result = await uploadImage.mutateAsync({ file: base64String });
          // console.log("Upload result:", result);

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

  // const handleDownloadQRCode = () => {
  //   const canvas = qrCodeRef.current;
  //   if (!canvas) return;

  //   try {
  //     const url = canvas.toDataURL("image/png");
  //     const link = document.createElement("a");
  //     link.download = `membership-qr-${profile?.membership?.id || "code"}.png`;
  //     link.href = url;
  //     link.click();
  //     toast.success("QR code downloaded successfully");
  //   } catch (error) {
  //     console.error("Download error:", error);
  //     toast.error("Failed to download QR code");
  //   }
  // };

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

  // Check-in filter handlers
  const handleApplyCheckinFilters = () => {
    setCheckinPage(1);
    refetchCheckinHistory();
  };

  const clearCheckinFilters = () => {
    setCheckinStartDate("");
    setCheckinEndDate("");
    setCheckinPage(1);
    refetchCheckinHistory();
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
    // <ProtectedRoute requiredPermissions={["member:profile"]}>
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
                {isEditing && isAdmin && (
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
                  <div className="flex items-center gap-2">
                    {isEditingPoints && isAdmin ? (
                      <>
                        <Input
                          type="number"
                          min="0"
                          value={pointsValue}
                          onChange={(e) => setPointsValue(e.target.value)}
                          className="w-32"
                          placeholder="Enter points"
                        />
                        <Button
                          size="sm"
                          onClick={handleUpdatePoints}
                          disabled={updatePoints?.isPending}
                          className="bg-[#BFFF00] text-black hover:bg-[#BFFF00]/90"
                        >
                          {updatePoints?.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditingPoints(false);
                            setPointsValue(profile?.point?.toString() ?? "0");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <p>{profile?.point || 0}</p>
                        {isAdmin && isViewingOtherMember && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsEditingPoints(true)}
                            className="h-6 px-2 text-xs text-[#BFFF00] hover:text-[#BFFF00]/80 hover:bg-[#BFFF00]/10"
                          >
                            Edit
                          </Button>
                        )}
                      </>
                    )}
                  </div>
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

        {/* Membership QR Code Section */}
        {/* Show QR code if we have membership.id from profile OR if viewing another member (memberId from URL is the membership ID) */}
        {(profile?.membership?.id ?? memberId) && (
          <Card className="mx-auto max-w-4xl mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg md:text-xl font-semibold text-[#BFFF00] flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Membership QR Code
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Use this QR code for gym check-in
              </p>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                {/* QR Code Display */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <QRCodeCanvas
                    ref={qrCodeRef}
                    value={profile?.membership?.id || memberId || ""}
                    size={200}
                    level="H"
                    includeMargin={true}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                </div>


                {/* Download Button */}
                {/* <Button
                  onClick={handleDownloadQRCode}
                  className="bg-[#BFFF00] text-black hover:bg-[#BFFF00]/90 w-full md:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download QR Code
                </Button> */}

                {/* Mobile-friendly info */}
                <div className="text-center text-xs text-muted-foreground max-w-md px-4">
                  <p>
                    Present this QR code at the gym entrance for quick check-in.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Check-in Statistics Section */}
        <Card className="mx-auto max-w-4xl mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg md:text-xl font-semibold text-[#BFFF00] flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Check-in Statistics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your gym attendance statistics
            </p>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            {isLoadingCheckinStats ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#BFFF00] mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading check-in statistics...</p>
                </div>
              </div>
            ) : checkinStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500 rounded-full">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {checkinStats.totalCheckins}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Total Check-ins</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500 rounded-full">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {checkinStats.monthlyCheckins}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">This Month</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500 rounded-full">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {checkinStats.weeklyCheckins}
                      </p>
                      <p className="text-sm text-purple-600 dark:text-purple-400">This Week</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-500 rounded-full">
                      <Clock className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {checkinStats.todayCheckins}
                      </p>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Today</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Unable to load check-in statistics</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-in History Section */}
        <Card className="mx-auto max-w-4xl mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg md:text-xl font-semibold text-[#BFFF00] flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Check-in History
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your recent gym check-in records
            </p>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            {/* Date Filters */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="text-sm font-medium mb-3">Filter by Date</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="checkinStartDate" className="text-xs">Start Date</Label>
                  <Input
                    id="checkinStartDate"
                    type="date"
                    value={checkinStartDate}
                    onChange={(e) => setCheckinStartDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="checkinEndDate" className="text-xs">End Date</Label>
                  <Input
                    id="checkinEndDate"
                    type="date"
                    value={checkinEndDate}
                    onChange={(e) => setCheckinEndDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    onClick={handleApplyCheckinFilters}
                    size="sm"
                    className="flex-1 bg-[#C9D953] hover:bg-[#C9D953]/90"
                  >
                    Apply
                  </Button>
                  <Button
                    onClick={clearCheckinFilters}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            {isLoadingCheckinHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#BFFF00] mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading check-in history...</p>
                </div>
              </div>
            ) : checkinHistory?.data && checkinHistory.data.length > 0 ? (
              <>
                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {checkinHistory.data.map((checkin) => (
                    <Card key={checkin.id} className="p-4 border-l-4 border-l-[#BFFF00]">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-[#BFFF00]">
                              {format(new Date(checkin.checkin), "MMM dd, yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(checkin.checkin), "hh:mm a")}
                            </p>
                          </div>
                          <Badge
                            variant={checkin.status === "Checked Out" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {checkin.status}
                          </Badge>
                        </div>
                        {checkin.checkout && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Checkout: </span>
                            <span className="font-medium">
                              {format(new Date(checkin.checkout), "hh:mm a")}
                            </span>
                          </div>
                        )}
                        {checkin.facilityDescription && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Facility: </span>
                            <span>{checkin.facilityDescription}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Check-in Time</TableHead>
                        <TableHead>Checkout Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Facility</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkinHistory.data.map((checkin) => (
                        <TableRow key={checkin.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {format(new Date(checkin.checkin), "MMM dd, yyyy")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(checkin.checkin), "hh:mm a")}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {checkin.checkout ? (
                              <div>
                                <p className="font-medium">
                                  {format(new Date(checkin.checkout), "MMM dd, yyyy")}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(checkin.checkout), "hh:mm a")}
                                </p>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={checkin.status === "Checked Out" ? "default" : "secondary"}>
                              {checkin.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {checkin.facilityDescription || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {checkinHistory && checkinHistory.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((checkinPage - 1) * checkinLimit) + 1} to{" "}
                      {Math.min(checkinPage * checkinLimit, checkinHistory.totalCount)} of{" "}
                      {checkinHistory.totalCount} check-ins
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCheckinPage(checkinPage - 1)}
                        disabled={!checkinHistory.hasPreviousPage}
                      >
                        Previous
                      </Button>
                      <span className="px-3 py-1 text-sm">
                        Page {checkinHistory.currentPage} of {checkinHistory.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCheckinPage(checkinPage + 1)}
                        disabled={!checkinHistory.hasNextPage}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Activity className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No check-in history</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  You haven't checked in to the gym yet. Your check-in history will appear here once you start visiting.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    // </ProtectedRoute>
  );
}
