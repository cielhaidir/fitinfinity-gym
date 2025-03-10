import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Shirt } from "lucide-react";

export function RewardsSection() {
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Rewards</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="h-5 w-5" />
                            <div>
                                <p className="font-medium">Protein Shake</p>
                                <p className="text-sm text-muted-foreground">100 points</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">
                            Redeem
                        </Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shirt className="h-5 w-5" />
                            <div>
                                <p className="font-medium">Fitness T-Shirt</p>
                                <p className="text-sm text-muted-foreground">200 points</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">
                            Redeem
                        </Button>
                    </div>
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