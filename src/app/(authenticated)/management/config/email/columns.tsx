import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/app/_components/ui/badge";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { DataTableColumnHeader } from "@/app/_components/datatable/data-table-column-header";
import { DataTableRowActions } from "@/app/_components/datatable/data-table-row-actions";
import { EmailConfig, EmailTemplate } from "./schema";
import { format } from "date-fns";

// Helper function to format dates
const formatDate = (date: Date) => {
  return format(date, "PPP");
};

// Email Configuration Columns
export const createEmailConfigColumns = ({
  onEditConfig,
  onDeleteConfig,
  onTestConnection,
  onSetActive,
}: {
  onEditConfig: (config: EmailConfig) => void;
  onDeleteConfig: (config: EmailConfig) => void;
  onTestConnection: (config: EmailConfig) => void;
  onSetActive: (config: EmailConfig) => void;
}): ColumnDef<EmailConfig>[] => [
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
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "host",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SMTP Host" />
    ),
    cell: ({ row }) => <div>{row.getValue("host")}</div>,
  },
  {
    accessorKey: "port",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Port" />
    ),
    cell: ({ row }) => <div>{row.getValue("port")}</div>,
  },
  {
    accessorKey: "fromEmail",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="From Email" />
    ),
    cell: ({ row }) => <div>{row.getValue("fromEmail")}</div>,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      return (
        <Badge variant={isActive ? "default" : "outline"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      // Handle createdAt which might not be in the schema but comes from the API
      const date = (row.original as any).createdAt;
      return <div>{date ? formatDate(date) : "N/A"}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const config = row.original;

      return (
        <DataTableRowActions
          row={row}
          actions={[
            {
              label: "Edit",
              onClick: () => onEditConfig(config),
            },
            {
              label: config.isActive ? "Active" : "Set as Active",
              onClick: () => onSetActive(config),
              disabled: config.isActive,
            },
            {
              label: "Test Connection",
              onClick: () => onTestConnection(config),
            },
            {
              label: "Delete",
              onClick: () => onDeleteConfig(config),
              disabled: config.isActive,
            },
          ]}
        />
      );
    },
  },
];

// Email Template Columns
export const createEmailTemplateColumns = ({
  onEditTemplate,
  onDeleteTemplate,
  onPreviewTemplate,
}: {
  onEditTemplate: (template: EmailTemplate) => void;
  onDeleteTemplate: (template: EmailTemplate) => void;
  onPreviewTemplate: (template: EmailTemplate) => void;
}): ColumnDef<EmailTemplate>[] => [
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
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      return (
        <Badge variant="outline" className="capitalize">
          {type.replace(/_/g, " ").toLowerCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "subject",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subject" />
    ),
    cell: ({ row }) => <div>{row.getValue("subject")}</div>,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");
      return (
        <Badge variant={isActive ? "default" : "outline"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Updated" />
    ),
    cell: ({ row }) => {
      // Handle updatedAt which might not be in the schema but comes from the API
      const date = (row.original as any).updatedAt;
      return <div>{date ? formatDate(date) : "N/A"}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const template = row.original;

      return (
        <DataTableRowActions
          row={row}
          actions={[
            {
              label: "Edit",
              onClick: () => onEditTemplate(template),
            },
            {
              label: "Preview",
              onClick: () => onPreviewTemplate(template),
            },
            {
              label: "Delete",
              onClick: () => onDeleteTemplate(template),
            },
          ]}
        />
      );
    },
  },
];