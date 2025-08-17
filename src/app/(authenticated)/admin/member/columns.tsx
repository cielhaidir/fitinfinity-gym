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
        const subscription = row.original.subscriptions.find(sub => sub.trainerId != null);
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

        const subscription = row.original.subscriptions.find(sub => sub.trainerId == null);
        const endDate = subscription?.endDate;
        const now = new Date();
        let durationLeft = endDate ? Math.max(0, Math.ceil((new Date(endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : "N/A";
        return (
          <div className="w-[150px]">
            {durationLeft !== "N/A" ? `${durationLeft} days` : durationLeft}
          </div>
        )
      },
    },
    {
      accessorKey: "sessionLeft",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sessions Left" />
      ),
      cell: ({ row }) => {
            const subscription = row.original.subscriptions.find(sub => sub.trainerId != null);
        const sessionLeft = subscription?.remainingSessions;
        return (
          <div className="w-[150px]">{sessionLeft ?? 0}</div>
        )
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
        const activeSubscription = Array.isArray(row.original.subscriptions) && row.original.subscriptions.find((sub) => {
          const now = new Date();
          const isNotExpired = sub.endDate ? new Date(sub.endDate) > now : true;
          return sub.isActive && isNotExpired;
        });

        let status = "Inactive";
        let variant: "default" | "secondary" | "destructive" = "destructive";

        if (activeSubscription) {
          if (activeSubscription.isFrozen) {
            status = "Frozen";
            variant = "secondary";
          } else {
            status = "Active";
            variant = "default";
          }
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
