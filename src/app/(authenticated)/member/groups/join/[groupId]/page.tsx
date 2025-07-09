"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, MapPin, Crown, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function JoinGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const { data: groupDetails, isLoading } = api.package.getGroupDetails.useQuery({
    groupSubscriptionId: groupId,
  });

  const joinGroupMutation = api.package.joinGroup.useMutation();

  const handleJoinGroup = async () => {
    try {
      await joinGroupMutation.mutateAsync({
        groupSubscriptionId: groupId,
      });
      toast.success("Successfully joined the training group!");
      router.push("/member/groups");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join group");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading group details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!groupDetails) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Group Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The training group you're trying to join doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/member/groups")}>
              Back to My Groups
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isGroupFull = groupDetails.totalMembers >= groupDetails.maxMembers;
  const canJoin = !isGroupFull && groupDetails.status === "ACTIVE";

  return (
    <ProtectedRoute requiredPermissions={["menu:groups"]}>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                Join Training Group
              </CardTitle>
              <CardDescription>
                You've been invited to join this training group
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Group Info */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">
                  {groupDetails.groupName || "Training Group"}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Package:</span>
                    <span className="font-medium">{groupDetails.package.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sessions:</span>
                    <span className="font-medium">{groupDetails.package.sessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members:</span>
                    <span className="font-medium">
                      {groupDetails.totalMembers} / {groupDetails.maxMembers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={groupDetails.status === "ACTIVE" ? "default" : "secondary"}>
                      {groupDetails.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Group Leader */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  Group Leader
                </h4>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={groupDetails.leadSubscription.member.user.image || undefined} />
                    <AvatarFallback>
                      {groupDetails.leadSubscription.member.user.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {groupDetails.leadSubscription.member.user.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {groupDetails.leadSubscription.member.user.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Members */}
              {groupDetails.groupMembers.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Current Members ({groupDetails.groupMembers.length})</h4>
                  <div className="space-y-2">
                    {groupDetails.groupMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.subscription.member.user.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.subscription.member.user.name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {member.subscription.member.user.name}
                            {member.subscription.member.userId === groupDetails.leadSubscription.member.userId && (
                              <Crown className="inline ml-1 h-3 w-3 text-yellow-600" />
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" size="sm">
                          {member.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Join Button or Status */}
              <div className="text-center">
                {canJoin ? (
                  <div className="space-y-3">
                    <Button 
                      onClick={handleJoinGroup}
                      disabled={joinGroupMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {joinGroupMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Joining Group...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Join Training Group
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      By joining, you'll get access to group training sessions and be able to 
                      participate in all group activities.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                      <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
                      <p className="text-sm font-medium text-destructive">
                        {isGroupFull ? "Group is Full" : "Group is Not Active"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isGroupFull 
                          ? "This training group has reached its maximum capacity."
                          : "This group is currently not accepting new members."
                        }
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => router.push("/member/groups")}
                    >
                      Back to My Groups
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}