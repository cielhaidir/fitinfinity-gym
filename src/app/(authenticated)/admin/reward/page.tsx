"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { DataTable } from "@/components/datatable/data-table";
import { createColumns } from "./columns";
import { Loader2 } from "lucide-react";

export default function RewardPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedReward, setSelectedReward] = useState("");
  const router = useRouter();
  const utils = api.useUtils();

  // Fetch data using tRPC
  const { data: members, isLoading: isLoadingMembers } = api.member.list.useQuery({
    page: 1,
    limit: 100,
  });
  const { data: rewards, isLoading: isLoadingRewards } = api.reward.list.useQuery({
    page: 1,
    limit: 100,
  });
  const { data: memberRewards, isLoading: isLoadingMemberRewards } = api.memberReward.list.useQuery({
    page: 1,
    limit: 10,
  });

  const { mutate: createMemberReward, isPending: isCreating } = api.memberReward.create.useMutation({
    onSuccess: () => {
      toast.success("Reward claimed successfully");
      setIsOpen(false);
      // Reset form
      setSelectedMember("");
      setSelectedReward("");
      // Invalidate and refetch data
      utils.memberReward.list.invalidate();
      utils.member.list.invalidate();
      utils.reward.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateReward = () => {
    if (!selectedMember || !selectedReward) {
      toast.error("Please select both member and reward");
      return;
    }

    createMemberReward({
      rewardId: selectedReward,
      memberId: selectedMember,
    });
  };

  const isLoading = isLoadingMembers || isLoadingRewards || isLoadingMemberRewards;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const columns = createColumns();

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen bg-background">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            Member Rewards
          </h2>
          <p className="text-muted-foreground">
            Manage member reward claims and track point usage
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-infinity w-full md:w-auto">
              Claim Reward
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Claim Reward</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="member">Select Member</Label>
                <Select
                  value={selectedMember}
                  onValueChange={setSelectedMember}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members?.items.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.user.name} - {member.user.point} points
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reward">Select Reward</Label>
                <Select
                  value={selectedReward}
                  onValueChange={setSelectedReward}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reward" />
                  </SelectTrigger>
                  <SelectContent>
                    {rewards?.items.map((reward) => (
                      <SelectItem key={reward.id} value={reward.id}>
                        {reward.name} - {reward.price} points
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleCreateReward}
                disabled={isCreating}
                className="bg-infinity"
              >
                {isCreating ? "Claiming..." : "Claim Reward"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        columns={columns}
        data={memberRewards || { items: [], total: 0, page: 1, limit: 10 }}
      />
    </div>
  );
}
