"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Shirt } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export function RewardsSection() {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const { data: rewardsData, isLoading } = api.reward.list.useQuery();
  const { data: userData } = api.user.getById.useQuery(
    { id: session?.user?.id ?? "" },
    { enabled: !!session?.user?.id },
  );

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<{
    id: string;
    name: string;
    price: number;
  } | null>(null);

  const redeemReward = api.reward.redeem.useMutation({
    onSuccess: () => {
      utils.reward.list.invalidate();
      utils.user.getById.invalidate({ id: session?.user?.id ?? "" });
      setIsConfirmModalOpen(false);
      setIsSuccessModalOpen(true);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsConfirmModalOpen(false);
    },
  });

  const handleRedeem = (reward: {
    id: string;
    name: string;
    price: number;
  }) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to redeem rewards");
      return;
    }

    if (!userData) {
      toast.error("Failed to get user data");
      return;
    }

    if (userData.point < reward.price) {
      toast.error("Insufficient points");
      return;
    }

    setSelectedReward(reward);
    setIsConfirmModalOpen(true);
  };

  const confirmRedeem = () => {
    if (!selectedReward || !session?.user?.id) return;

    redeemReward.mutate({
      memberId: session.user.id,
      rewardId: selectedReward.id,
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Rewards</h3>
        <div>Loading rewards...</div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Rewards</h3>
        <div className="space-y-4">
          {rewardsData?.items.map((reward) => (
            <div key={reward.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5" />
                <div>
                  <p className="font-medium">{reward.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {reward.price} points
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleRedeem({
                    id: reward.id,
                    name: reward.name,
                    price: reward.price,
                  })
                }
                disabled={reward.stock <= 0}
              >
                {reward.stock > 0 ? "Redeem" : "Out of Stock"}
              </Button>
            </div>
          ))}

          {rewardsData?.items.length === 0 && (
            <p className="text-center text-muted-foreground">
              No rewards available at the moment.
            </p>
          )}
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reward Redemption</DialogTitle>
            <DialogDescription>
              Are you sure you want to redeem {selectedReward?.name} for{" "}
              {selectedReward?.price} points?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmRedeem}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reward Claimed Successfully!</DialogTitle>
            <DialogDescription>
              Please screenshot this page and show it to the cashier to claim
              your reward.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4 rounded-lg border p-4">
            <div>
              <p className="font-medium">Reward Details:</p>
              <p className="text-sm text-muted-foreground">
                {selectedReward?.name}
              </p>
            </div>
            <div>
              <p className="font-medium">Claim Date:</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "EEEE, d MMMM yyyy", { locale: id })}
              </p>
            </div>
            <div>
              <p className="font-medium">Points Used:</p>
              <p className="text-sm text-muted-foreground">
                {selectedReward?.price} points
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSuccessModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
