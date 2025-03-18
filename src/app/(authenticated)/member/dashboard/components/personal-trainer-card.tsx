import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PersonalTrainerCard() {
    return (
        <Card className="col-span-1 p-6">
            <div className="relative h-[200px] overflow-hidden rounded-lg">
                <img
                    src="/assets/ptDashboard.png"
                    alt="Personal Trainer"
                    className="h-full w-full object-cover"
                />
            </div>
            <div className="mt-4">
                <h3 className="text-lg font-semibold">Choose your Personal Trainer</h3>
                <p className="text-sm text-muted-foreground">
                    Get fit with intensive training from professional trainers
                </p>
                <Button className="mt-4 w-full bg-[#CDDE11] text-black hover:bg-[#CDDE11]/90">
                    See Personal Trainer
                </Button>
            </div>
        </Card>
    );
} 