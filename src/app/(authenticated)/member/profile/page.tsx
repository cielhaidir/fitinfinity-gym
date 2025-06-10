"use client";

import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Camera } from "lucide-react";
import { ChangePasswordDialog } from "./change-password-dialog";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
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

  const { data: profile, isLoading } = api.profile.get.useQuery(undefined, {
    enabled: !!session?.user.id,
  });

  const updateProfile = api.profile.update.useMutation({
    onSuccess: () => {
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

    // If phone is not registered or hasn't changed, proceed with update
    const genderValue = ["MALE", "FEMALE", "OTHER"].includes(formData.gender)
      ? formData.gender
      : undefined;
    const data = {
      ...formData,
      birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
      height: formData.height ? parseFloat(formData.height) : undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      gender: genderValue,
    };
    updateProfile.mutate(data);
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

  return (
    <div className="container mx-auto py-8">
      <Card className="mx-auto max-w-2xl">
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
              <p className="text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-[#C9D953] hover:bg-[#C9D953]/90"
            >
              Edit Profile
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                form="profile-form"
                type="submit"
                disabled={updateProfile.isPending}
                className="bg-[#C9D953] hover:bg-[#C9D953]/90"
              >
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
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
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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
            <ChangePasswordDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
