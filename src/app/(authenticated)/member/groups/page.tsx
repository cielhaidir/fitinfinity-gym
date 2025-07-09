"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Calendar, UserPlus, UserMinus, Crown, MapPin } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/auth/protected-route";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { useRBAC } from "@/hooks/useRBAC";

export default function MyGroupsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  
  const { data: session } = useSession();
  const { hasPermission } = useRBAC();

  const { data: myGroups = [], refetch } = api.package.getMyGroups.useQuery();
  const { data: availableMembers = [] } = api.package.getAvailableMembers.useQuery({
    groupSubscriptionId: selectedGroupId,
    search: searchTerm,
  }, {
    enabled: !!selectedGroupId && isInviteDialogOpen,
  });

  const leaveGroupMutation = api.package.leaveGroup.useMutation();
  const inviteMembersMutation = api.package.inviteToGroup.useMutation();

  const handleLeaveGroup = async (groupId: string) => {
    try {
      await leaveGroupMutation.mutateAsync({ groupSubscriptionId: groupId });
      toast.success("Successfully left the group");
      refetch();
    } catch (error) {
      toast.error("Failed to leave group");
    }
  };

  const handleInviteMembers = async (memberIds: string[]) => {
    try {
      const results = await inviteMembersMutation.mutateAsync({
        groupSubscriptionId: selectedGroupId,
        memberIds,
      });
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (successful > 0) {
        toast.success(`Successfully invited ${successful} member(s)`);
      }
      if (failed > 0) {
        toast.warning(`Failed to invite ${failed} member(s)`);
      }
      
      setIsInviteDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to send invitations");
    }
  };

  const isGroupLeader = (group: any, userId: string) => {
    return group.groupSubscription?.leadSubscription?.member?.userId === userId;
  };

  return (
    <ProtectedRoute requiredPermissions={["menu:groups"]}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Training Groups</h1>
          <p className="text-muted-foreground">
            Manage your group training memberships and invite friends
          </p>
        </div>

        {myGroups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven't joined any training groups. Purchase a group package to get started!
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Browse Group Packages
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myGroups.map((groupMember) => {
              const group = groupMember.groupSubscription;
              const isLeader = group.leadSubscription?.member?.userId === groupMember.subscription.member?.userId;
              
              return (
                <Card key={group.id} className="relative">
                  {isLeader && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Crown className="mr-1 h-3 w-3" />
                        Leader
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {group.groupName || "Training Group"}
                    </CardTitle>
                    <CardDescription>
                      {group.package.name} • {group.package.sessions} Sessions
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Members</span>
                        <span className="font-medium">
                          {group.totalMembers} / {group.maxMembers}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {group.groupMembers.slice(0, 3).map((member) => (
                          <div key={member.id} className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.subscription.member.user.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {member.subscription.member.user.name?.[0] || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">
                              {member.subscription.member.user.name}
                              {member.subscription.member.userId === group.leadSubscription?.member?.userId && (
                                <Crown className="inline ml-1 h-3 w-3 text-yellow-600" />
                              )}
                            </span>
                          </div>
                        ))}
                        {group.groupMembers.length > 3 && (
                          <div className="text-sm text-muted-foreground">
                            +{group.groupMembers.length - 3} more members
                          </div>
                        )}
                      </div>
                      
                      {/* <div className="flex gap-2">
                        {isLeader && group.totalMembers < group.maxMembers && hasPermission("manage:groups") && (
                          <Dialog 
                            open={isInviteDialogOpen && selectedGroupId === group.id}
                            onOpenChange={(open) => {
                              setIsInviteDialogOpen(open);
                              if (open) setSelectedGroupId(group.id);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="flex-1">
                                <UserPlus className="mr-1 h-3 w-3" />
                                Invite
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Invite Members</DialogTitle>
                                <DialogDescription>
                                  Search and invite members to join your training group
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <Input
                                  placeholder="Search members by name or email..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {availableMembers.map((member) => (
                                    <div 
                                      key={member.id} 
                                      className="flex items-center justify-between p-2 border rounded"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                          <AvatarImage src={member.user.image || undefined} />
                                          <AvatarFallback>
                                            {member.user.name?.[0] || "U"}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="font-medium">{member.user.name}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {member.user.email}
                                          </div>
                                        </div>
                                      </div>
                                      <Button 
                                        size="sm"
                                        onClick={() => handleInviteMembers([member.id])}
                                      >
                                        Invite
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleLeaveGroup(group.id)}
                          className="flex-1"
                        >
                          <UserMinus className="mr-1 h-3 w-3" />
                          Leave
                        </Button>
                      </div> */}
                      
                      <div className="pt-2 border-t">
                        <Badge variant="outline" className="w-full justify-center">
                          {group.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}