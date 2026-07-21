"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { type Member } from "./schema";
import { DataTableColumnHeader } from "@/components/datatable/data-table-column-header";
import { DataTableRowActions } from "@/components/datatable/data-table-row-actions";
import { sub } from "date-fns";

interface ColumnsProps {
  onEditMember: (member: any) => void;
  onDeleteMember: (member: any) => void;
  customActions?: { label: string; action: (member: any) => void }[]; // Support multiple custom actions
  getCustomActions?: (member: any) => { label: string; action: (member: any) => void }[]; // Dynamic custom actions
}

export const createColumns = ({
  onEditMember,
  onDeleteMember,
  customActions,
  getCustomActions,
}: ColumnsProps): ColumnDef<Member>[] => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] ring-black ring-offset-background"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px] ring-infinity"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "user.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member Name" />
      ),
      cell: ({ row }) => (
        <div className="w-[150px]">{row.original.user.name}</div>
      ),
    },
    {
      id: "email",
      accessorKey: "user.email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
    },
    // {
    //   id: "fc",
    //   header: ({ column }) => (
    //     <DataTableColumnHeader column={column} title="FC" />
    //   ),
    //   cell: ({ row }) => {
    //     const fc = row.original.fc;
    //     return (
    //       <div className="flex items-center justify-center">
    //         {fc ? (
    //           <Badge variant="outline" className="w-[100px] justify-center">
    //             {fc.user.name}
    //           </Badge>
    //         ) : (
    //           <Badge
    //             variant="outline"
    //             className="w-[100px] justify-center text-muted-foreground"
    //           >
    //             Not Assigned
    //           </Badge>
    //         )}
    //       </div>
    //     );
    //   },
    // },
    {
      id: "pt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="PT" />
      ),
      cell: ({ row }) => {
        const subscription = row.original.subscriptions.find((sub: any) => sub.trainerId != null && !sub.deletedAt && sub.isActive);
        const pt = subscription?.trainer?.user.name;
        return (
          <div className="flex items-center justify-center">
            {pt ? (
              <Badge variant="outline" className="w-[100px] justify-center">
                {pt}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="w-[100px] justify-center text-muted-foreground"
              >
                Not Assigned
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "durationLeft",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duration Left" />
      ),
      cell: ({ row }) => {
        const gymSubs = row.original.subscriptions.filter((sub: any) =>
          !sub.deletedAt && sub.endDate && sub.isActive && sub.package?.type === "GYM_MEMBERSHIP"
        );
        const latestSub = gymSubs.sort((a: any, b: any) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
        const endDate = latestSub?.endDate;
        const now = new Date();
        const durationLeft = endDate
          ? Math.max(0, Math.ceil((new Date(endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        const endDateStr = endDate
          ? new Date(endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
          : null;
        return (
          <div className="w-[130px]">
            {durationLeft !== null
              ? <>
                  <span>{durationLeft} days</span>
                  {endDateStr && <div className="text-xs text-muted-foreground mt-0.5">{endDateStr}</div>}
                </>
              : <span className="text-muted-foreground">N/A</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "sessionLeft",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sessions Left" />
      ),
      cell: ({ row }) => {
        const activePtSubs = row.original.subscriptions.filter((sub: any) =>
          sub.trainerId != null && !sub.deletedAt && sub.isActive &&
          (sub.package?.type === "PERSONAL_TRAINER" || sub.package?.type === "GROUP_TRAINING")
        );
        if (activePtSubs.length === 0) {
          return <div className="w-[130px] text-muted-foreground">-</div>;
        }
        const totalSessions = activePtSubs.reduce((total: number, sub: any) => total + (sub.remainingSessions ?? 0), 0);
        // end date dari PT sub yang paling akhir
        const latestPtSub = activePtSubs.sort((a: any, b: any) =>
          new Date(b.endDate ?? 0).getTime() - new Date(a.endDate ?? 0).getTime()
        )[0];
        const ptEndDate = latestPtSub?.endDate ? new Date(latestPtSub.endDate) : null;
        const endDateStr = ptEndDate
          ? ptEndDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
          : null;
        const daysLeft = ptEndDate
          ? Math.max(0, Math.ceil((ptEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        return (
          <div className="w-[130px]">
            <span className="font-medium">{totalSessions} sesi</span>
            {endDateStr && (
              <div className="text-xs text-muted-foreground mt-0.5">{endDateStr}</div>
            )}
            {daysLeft !== null && (
              <div className="text-xs text-muted-foreground">{daysLeft} hari</div>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: "classSessionLeft",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Class Sessions" />
      ),
      cell: ({ row }) => {
        const activeClassSubs = row.original.subscriptions.filter((sub: any) =>
          sub.package?.type === "CLASS_SESSION" && !sub.deletedAt && sub.isActive
        );
        if (activeClassSubs.length === 0) {
          return <div className="w-[120px] text-muted-foreground">-</div>;
        }
        const totalRemaining = activeClassSubs.reduce((total: number, sub: any) => total + (sub.remainingSessions ?? 0), 0);
        return (
          <div className="w-[120px]">{totalRemaining}</div>
        );
      }
    },
    // {
    //   accessorKey: "registerDate",
    //   header: ({ column }) => (
    //     <DataTableColumnHeader column={column} title="Register Date" />
    //   ),
    //   cell: ({ row }) => (
    //     <div className="w-[150px]">
    //       {new Date(row.getValue("registerDate")).toLocaleDateString()}
    //     </div>
    //   ),
    // },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Active" />
      ),
      cell: ({ row }) => {
        const subs = Array.isArray(row.original.subscriptions) ? row.original.subscriptions : [];
        const now = new Date();

        // 1. Check for currently frozen subscriptions (isFrozen = true)
        const frozenSub = subs.find((sub: any) => sub.isFrozen && !sub.deletedAt);

        // 2. Check for scheduled future freeze (frozenAt in the future, not yet active)
        const scheduledFreezeSub = !frozenSub && subs.find((sub: any) =>
          !sub.deletedAt && sub.frozenAt && new Date(sub.frozenAt) > now && !sub.isFrozen
        );

        // 3. Check for active subscriptions
        const activeSub = subs.find((sub: any) => {
          const isNotExpired = sub.endDate ? new Date(sub.endDate) > now : true;
          return sub.isActive && isNotExpired && !sub.deletedAt;
        });

        let status = "Inactive";
        let variant: "default" | "secondary" | "destructive" = "destructive";

        if (frozenSub) {
          status = "Frozen";
          variant = "secondary";
        } else if (scheduledFreezeSub) {
          status = "Freeze Scheduled";
          variant = "secondary";
        } else if (activeSub) {
          status = "Active";
          variant = "default";
        }

        return (
          <Badge
            variant={variant}
            className="w-[100px] justify-center"
          >
            {status}
          </Badge>
        );
      },
    },
    {
      id: "rfidNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="RFID" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Badge
            variant="outline"
            className="cursor-pointer transition-colors hover:bg-infinity hover:text-white"
            onClick={() => onEditMember(row.original)}
          >
            Assign RFID
          </Badge>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const member = row.original;
        const dynamicActions = getCustomActions ? getCustomActions(member) : (customActions || []);
        return (
          <DataTableRowActions
            row={row}
            onEdit={onEditMember}
            onDelete={onDeleteMember}
            customActions={dynamicActions}
            showEdit={false}
          />
        );
      },
    },
  ];
