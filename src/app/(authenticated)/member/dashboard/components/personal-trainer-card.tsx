import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function PersonalTrainerCard() {
  return (
    <Card className="col-span-1 p-6">
      <div className="relative h-[200px] overflow-hidden rounded-lg">
        <video
          src="/assets/dashboard/vid.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold">Choose your Personal Trainer</h3>
        <p className="text-sm text-muted-foreground">
          Get fit with intensive training from professional trainers
        </p>
        <Link href="/member/personal-trainer">
          <Button className="mt-4 w-full bg-[#CDDE11] text-black hover:bg-[#CDDE11]/90">
            See Personal Trainer
          </Button>
        </Link>
      </div>
    </Card>
  );
}
