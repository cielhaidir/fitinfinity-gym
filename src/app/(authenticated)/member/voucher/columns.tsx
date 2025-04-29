import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Voucher {
  id: string;
  name: string;
  maxClaim: number;
  type: "REFERRAL" | "GENERAL";
  discountType: "PERCENT" | "CASH";
  amount: number;
  isActive: boolean;
  expiryDate: Date | null;
  createdAt: Date;
}

interface ColumnProps {
  onClaim: (voucherId: string) => void;
}

export const createColumns = ({ onClaim }: ColumnProps): ColumnDef<Voucher>[] => [
  {
    accessorKey: "name",
    header: "Voucher Name",
  },
  {
    accessorKey: "discountType",
    header: "Discount Type",
    cell: ({ row }) => {
      const type = row.getValue("discountType") as string;
      return (
        <Badge variant={type === "PERCENT" ? "default" : "secondary"}>
          {type === "PERCENT" ? "Percentage" : "Fixed Amount"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Discount Amount",
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number;
      const type = row.getValue("discountType") as string;
      return type === "PERCENT" ? `${amount}%` : `Rp ${amount.toLocaleString()}`;
    },
  },
  {
    accessorKey: "maxClaim",
    header: "Max Claims",
  },
  {
    accessorKey: "expiryDate",
    header: "Expiry Date",
    cell: ({ row }) => {
      const date = row.getValue("expiryDate") as Date | null;
      return date ? format(new Date(date), "dd MMM yyyy") : "No expiry";
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const voucher = row.original;
      const isExpired = voucher.expiryDate ? new Date(voucher.expiryDate) < new Date() : false;
      const isInactive = !voucher.isActive;

      return (
        <Button
          onClick={() => onClaim(voucher.id)}
          disabled={isExpired || isInactive}
          variant="default"
          size="sm"
        >
          Claim Voucher
        </Button>
      );
    },
  },
]; 