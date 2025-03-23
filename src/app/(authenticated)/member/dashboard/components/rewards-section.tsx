"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Shirt } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export function RewardsSection() {
    const utils = api.useUtils();
    const { data: rewardsData, isLoading } = api.reward.list.useQuery();
    
    const redeemReward = api.reward.redeem.useMutation({
        onSuccess: () => {
            utils.reward.list.invalidate();
            toast.success("Reward redeemed successfully!");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleRedeem = (rewardId: string) => {
        redeemReward.mutate({ rewardId });
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                                onClick={() => handleRedeem(reward.id)}
                                disabled={reward.stock <= 0}
                            >
                                {reward.stock > 0 ? 'Redeem' : 'Out of Stock'}
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

            <Card className="bg-[#CDDE11] p-6">
                <div className="flex justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-black">Special Offer!</h3>
                        <p className="text-black/80">
                            Get 15% Gym VIP Membership 6 Month Limited time offer
                        </p>
                        <p className="mt-2 text-sm text-black/60">Don't miss this time</p>
                    </div>
                    <Button variant="secondary" className="text-black">
                        Learn More
                    </Button>
                </div>
            </Card>
        </div>
    );
} 