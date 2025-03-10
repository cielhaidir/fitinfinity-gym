import { Card } from "@/components/ui/card";
import { Activity, Trophy, Calendar } from "lucide-react";

export function StatsCards() {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="p-6">
                <div className="flex items-center gap-4">
                    <div className="rounded-full bg-yellow-500/20 p-3">
                        <Activity className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Workout This Year</p>
                        <h2 className="text-2xl font-bold">24</h2>
                    </div>
                </div>
            </Card>

            <Card className="p-6">
                <div className="flex items-center gap-4">
                    <div className="rounded-full bg-green-500/20 p-3">
                        <Trophy className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Achievement Points</p>
                        <h2 className="text-2xl font-bold">6,620</h2>
                    </div>
                </div>
            </Card>

            <Card className="p-6">
                <div className="flex items-center gap-4">
                    <div className="rounded-full bg-blue-500/20 p-3">
                        <Calendar className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Next Class</p>
                        <h2 className="text-2xl font-bold">In 2 Hour</h2>
                    </div>
                </div>
            </Card>
        </div>
    );
} 