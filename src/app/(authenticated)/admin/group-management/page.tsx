"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Calendar, UserPlus, Crown, Search, Filter, UserMinus, Settings } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/datatable/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";

export default function AdminGroupManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
// Ensure only one dialog is open at a time
const openInviteDialog = (groupId: string) => {
  setIsInviteDialogOpen(true);
  setIsManageMembersDialogOpen(false);
  setSelectedGroupId(groupId);
  setSearchTerm("");
  setShouldLoadMembers(false);
};
const closeInviteDialog = () => {
  setIsInviteDialogOpen(false);
  setSelectedGroupId("");
  setSearchTerm("");
  setShouldLoadMembers(false);
};
const openManageMembersDialog = (groupId: string) => {
  setIsManageMembersDialogOpen(true);
  setIsInviteDialogOpen(false);
  setSelectedGroupId(groupId);
};
const closeManageMembersDialog = () => {
  setIsManageMembersDialogOpen(false);
  setSelectedGroupId("");
};
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isManageMembersDialogOpen, setIsManageMembersDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [shouldLoadMembers, setShouldLoadMembers] = useState(false);

  // Get all groups (admin view) - would need to create this endpoint
  const { data: allGroups = [], refetch: refetchGroups } = api.package.getAllGroups.useQuery();
  
  const { data: availableMembers = [] } = api.package.getAvailableMembers.useQuery({
    groupSubscriptionId: selectedGroupId,
    search: searchTerm,
  }, {
    enabled: !!selectedGroupId && isInviteDialogOpen && shouldLoadMembers,
  });

  const { data: groupDetails } = api.package.getGroupDetails.useQuery({
    groupSubscriptionId: selectedGroupId,
  }, {
    enabled: !!selectedGroupId && isManageMembersDialogOpen,
  });

  const inviteMembersMutation = api.package.inviteToGroup.useMutation();
  const kickMemberMutation = api.package.kickMember.useMutation();

  const handleInviteMembers = async (memberIds: string[]) => {
    try {
      const results = await inviteMembersMutation.mutateAsync({
        groupSubscriptionId: selectedGroupId,
        memberIds,
      });
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (successful > 0) {
        toast.success(`Successfully added ${successful} member(s) to group`);
      }
      if (failed > 0) {
        toast.warning(`Failed to add ${failed} member(s)`);
      }
      
      setIsInviteDialogOpen(false);
      setSearchTerm("");
      setShouldLoadMembers(false);
      refetchGroups();
    } catch (error) {
      toast.error("Failed to add members to group");
    }
  };

  const handleKickMember = async (memberId: string, memberName: string) => {
    try {
      await kickMemberMutation.mutateAsync({
        groupSubscriptionId: selectedGroupId,
        memberId,
      });
      
      toast.success(`Successfully removed ${memberName} from group`);
      refetchGroups();
    } catch (error) {
      toast.error("Failed to remove member from group");
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "groupName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Group Name" />
      ),
      cell: ({ row }) => {
        const group = row.original;
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {group.groupName || "Unnamed Group"}
          </div>
        );
      },
    },
    {
      accessorKey: "packageName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Package" />
      ),
      cell: ({ row }) => {
        const group = row.original;
        return (
          <div>
            <div className="font-medium">{group.package.name}</div>
            <div className="text-sm text-muted-foreground">
              {group.package.sessions} sessions
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "leader",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Leader" />
      ),
      cell: ({ row }) => {
        const group = row.original;
        const leader = group.leadSubscription.member.user;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={leader.image || undefined} />
              <AvatarFallback className="text-xs">
                {leader.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <span>{leader.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "members",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Members" />
      ),
      cell: ({ row }) => {
        const group = row.original;
        return (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{group.totalMembers} / {group.maxMembers}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const group = row.original;
        const getStatusVariant = (status: string) => {
          switch (status) {
            case "ACTIVE": return "default";
            case "PENDING": return "secondary";
            case "EXPIRED": return "destructive";
            case "CANCELLED": return "outline";
            default: return "secondary";
          }
        };
        
        return (
          <Badge variant={getStatusVariant(group.status)}>
            {group.status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const group = row.original;
        const canAddMembers = group.totalMembers < group.maxMembers;
        
        return (
          <div className="flex gap-2">
            {canAddMembers && (
              <Dialog
                open={isInviteDialogOpen && selectedGroupId === group.id}
onOpenChange={open => open ? openInviteDialog(group.id) : closeInviteDialog()}
              >
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <UserPlus className="mr-1 h-3 w-3" />
                    Add Members
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Members to Group</DialogTitle>
                    <DialogDescription>
                      Search and add members to this training group (admin override)
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <Input
                      placeholder="Search members by name or email..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShouldLoadMembers(true);
                      }}
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
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            <Dialog
              open={isManageMembersDialogOpen && selectedGroupId === group.id}
onOpenChange={open => open ? openManageMembersDialog(group.id) : closeManageMembersDialog()}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Settings className="mr-1 h-3 w-3" />
                  Manage Members
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Manage Group Members</DialogTitle>
                  <DialogDescription>
                    View and manage all members in this training group
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {groupDetails && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Group Leader</h3>
                      <div className="flex items-center gap-2 p-2 border rounded bg-muted/50">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={groupDetails.leadSubscription.member.user.image || undefined} />
                          <AvatarFallback>
                            {groupDetails.leadSubscription.member.user.name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">{groupDetails.leadSubscription.member.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {groupDetails.leadSubscription.member.user.email}
                          </div>
                        </div>
                        <Crown className="h-4 w-4 text-yellow-500" />
                      </div>
                    </div>
                  )}
                  
                  {groupDetails && groupDetails.groupMembers.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Members ({groupDetails.groupMembers.length})</h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {groupDetails.groupMembers.map((groupMember) => {
                          const member = groupMember.subscription.member;
                          const isLeader = member.id === groupDetails.leadSubscription.memberId;
                          
                          return (
                            <div
                              key={groupMember.id}
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
                                {isLeader && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                              {!isLeader && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={kickMemberMutation.isPending}
                                    >
                                      <UserMinus className="mr-1 h-3 w-3" />
                                      Remove
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove {member.user.name} from this group?
                                        This action cannot be undone and will deactivate their subscription.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleKickMember(member.id, member.user.name || "Unknown")}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remove Member
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );
      },
    },
  ];

  const tableData = {
    items: allGroups,
    total: allGroups.length,
    page: 1,
    limit: allGroups.length,
  };

  return (
    <ProtectedRoute requiredPermissions={["menu:group-management"]}>
      <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Group Management
            </h2>
            <p className="text-muted-foreground">
              Manage all training groups and memberships across the system
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allGroups.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allGroups.filter(g => g.status === "ACTIVE").length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allGroups.reduce((sum, g) => sum + g.totalMembers, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Spots</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allGroups.reduce((sum, g) => sum + (g.maxMembers - g.totalMembers), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Groups Table */}
        <DataTable
          data={tableData}
          columns={columns}
          searchColumns={[{ id: "groupName", placeholder: "Search groups..." }]}
        />
      </div>
    </ProtectedRoute>
  );
}