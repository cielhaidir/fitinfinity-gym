"use client";
"use client";

import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Nama voucher harus diisi"),
  maxClaim: z.number().min(1, "Max klaim harus lebih dari 0"),
  type: z.enum(["REFERRAL", "GENERAL"]),
  discountType: z.enum(["PERCENT", "CASH"]),
  referralCode: z.string().optional(),
  amount: z.number().min(1, "Jumlah diskon harus lebih dari 0"),
  expiryDate: z.date().nullable().optional(),
});

interface CreateEditVoucherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher?: any;
  onSuccess: () => void;
}

export default function CreateEditVoucherDialog({
  open,
  onOpenChange,
  voucher,
  onSuccess,
}: CreateEditVoucherDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      maxClaim: 1,
      type: "GENERAL",
      discountType: "CASH",
      amount: 0,
    },
  });

  const createVoucher = api.voucher.create.useMutation({
    onSuccess: () => {
      toast.success("Voucher berhasil dibuat");
      onSuccess();
    },
  });

  const updateVoucher = api.voucher.update.useMutation({
    onSuccess: () => {
      toast.success("Voucher berhasil diupdate");
      onSuccess();
    },
  });

  useEffect(() => {
    if (voucher) {
      form.reset({
        name: voucher.name,
        maxClaim: voucher.maxClaim,
        type: voucher.type,
        discountType: voucher.discountType,
        referralCode: voucher.referralCode,
        amount: voucher.amount,
        expiryDate: voucher.expiryDate,
      });
    } else {
      form.reset({
        name: "",
        maxClaim: 1,
        type: "GENERAL",
        discountType: "CASH",
        amount: 0,
      });
    }
  }, [voucher, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const formData = {
        ...values,
        expiryDate: values.expiryDate === undefined ? null : values.expiryDate,
      };

      if (voucher) {
        await updateVoucher.mutateAsync({
          ...formData,
          id: voucher.id,
          isActive: voucher.isActive,
        });
      } else {
        await createVoucher.mutateAsync(formData);
      }
    } catch (error) {
      toast.error(
        voucher ? "Gagal mengupdate voucher" : "Gagal membuat voucher",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {voucher ? "Edit Voucher" : "Tambah Voucher"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Voucher</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Voucher</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe voucher" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="REFERRAL">Referral</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Diskon</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe diskon" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="PERCENT">Percent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah Diskon</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxClaim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maksimal Klaim</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch("type") === "REFERRAL" && (
              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Referral</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit">{voucher ? "Update" : "Tambah"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
