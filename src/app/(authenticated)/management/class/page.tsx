"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { DataTable } from "@/components/datatable/data-table";
import { columns } from "./columns";
import { ClassForm } from "./class-form";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { Class } from "./schema";

export default function ClassPage() {
  // Form state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    limit: null as number | null,
    instructorName: "",
    schedule: new Date(),
    duration: 60,
    price: 100000,
  });

  // Table state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const utils = api.useUtils();

  // Query with stable configuration
  const { data: classes } = api.class.list.useQuery(
    {
      page,
      limit: pageSize,
      search,
    },
    {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  );

  // Mutations
  const createMutation = api.class.create.useMutation();
  const updateMutation = api.class.update.useMutation();
  const deleteMutation = api.class.remove.useMutation();

  // Update form data when selected class changes
  useEffect(() => {
    if (selectedClass) {
      setFormData({
        name: selectedClass.name,
        limit: selectedClass.limit,
        instructorName: selectedClass.instructorName,
        schedule: new Date(selectedClass.schedule),
        duration: selectedClass.duration,
        price: selectedClass.price,
      });
    } else {
      setFormData({
        name: "",
        limit: null,
        instructorName: "",
        schedule: new Date(),
        duration: 60,
        price: 100000,
      });
    }
  }, [selectedClass]);

  // Form handlers
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({ ...prev, name }));
  };

  const handleLimitChange = (limit: number | null) => {
    setFormData((prev) => ({ ...prev, limit }));
  };

  // Removed handleTrainerChange
  const handleInstructorNameChange = (instructorName: string) => {
    setFormData((prev) => ({ ...prev, instructorName }));
  };

  const handleScheduleChange = (schedule: Date) => {
    setFormData((prev) => ({ ...prev, schedule }));
  };

  const handleDurationChange = (duration: number) => {
    setFormData((prev) => ({ ...prev, duration }));
  };

  const handlePriceChange = (price: number) => {
    console.log("Price changed to:", price); // Debug log
    setFormData((prev) => ({ ...prev, price }));
  };

  const handleCreateOrUpdateClass = async () => {
    try {
      console.log("Submitting form data:", formData); // Debug log

      if (isEditMode && selectedClass) {
        await updateMutation.mutateAsync({
          id: selectedClass.id!,
          name: formData.name as
            | "yoga"
            | "zumba"
            | "strengh"
            | "core"
            | "booty shaping"
            | "cardio dance"
            | "bachata"
            | "muaythai"
            | "poundfit"
            | "freestyle dance"
            | "kpop dance"
            | "circuit"
            | "thaiboxig"
            | "cardio u",
          limit: formData.limit,
          instructorName: formData.instructorName,
          schedule: formData.schedule,
          duration: formData.duration,
          price: formData.price,
        });
        toast.success("Class updated successfully!");
      } else {
        await createMutation.mutateAsync({
          name: formData.name as
            | "yoga"
            | "zumba"
            | "strengh"
            | "core"
            | "booty shaping"
            | "cardio dance"
            | "bachata"
            | "muaythai"
            | "poundfit"
            | "freestyle dance"
            | "kpop dance"
            | "circuit"
            | "thaiboxig"
            | "cardio u",
          limit: formData.limit,
          instructorName: formData.instructorName,
          schedule: formData.schedule,
          duration: formData.duration,
          price: formData.price,
        });
        toast.success("Class created successfully!");
      }

      // Reset form and close sheet
      setIsSheetOpen(false);
      setIsEditMode(false);
      setSelectedClass(null);
      setFormData({
        name: "",
        limit: null,
        instructorName: "",
        schedule: new Date(),
        duration: 60,
        price: 100000,
      });

      // Refresh data
      await utils.class.list.invalidate();
    } catch (error) {
      console.error("Error submitting form:", error); // Debug log
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleEdit = (class_: Class) => {
    setSelectedClass(class_);
    setIsEditMode(true);
    setIsSheetOpen(true);
  };

  const handleDelete = async (class_: Class) => {
    if (!class_.id) return;

    try {
      await deleteMutation.mutateAsync({ id: class_.id });
      toast.success("Class deleted successfully!");
      await utils.class.list.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  return (
    <div className="container mx-auto min-h-screen bg-background p-4 md:p-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Classes</h2>
          <p className="text-muted-foreground">
            Manage your fitness classes here
          </p>
        </div>
        <Button
          className="w-full bg-infinity md:w-auto"
          onClick={() => setIsSheetOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Class
        </Button>
      </div>

      <div className="rounded-md">
        <DataTable
          columns={columns({
            onEdit: handleEdit,
            onDelete: handleDelete,
          })}
          data={
            (classes as {
              items: Class[];
              total: number;
              page: number;
              limit: number;
            }) ?? { items: [], total: 0, page: 1, limit: 10 }
          }
          onPaginationChange={(newPage, newLimit) => {
            setPage(newPage);
            setPageSize(newLimit);
          }}
          searchColumns={[
            { id: "name", placeholder: "Search by class name..." },
          ]}
          onSearch={(value) => setSearch(value)}
        />
      </div>

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsSheetOpen(false);
            setIsEditMode(false);
            setSelectedClass(null);
            setFormData({
              name: "",
              limit: null,
              instructorName: "",
              schedule: new Date(),
              duration: 60,
              price: 100000,
            });
          }
        }}
      >
        <ClassForm
          name={
            formData.name as
              | "yoga"
              | "zumba"
              | "strengh"
              | "core"
              | "booty shaping"
              | "cardio dance"
              | "bachata"
              | "muaythai"
              | "poundfit"
              | "freestyle dance"
              | "kpop dance"
              | "circuit"
              | "thaiboxig"
              | "cardio u"
          }
          limit={formData.limit}
          instructorName={formData.instructorName}
          schedule={formData.schedule}
          duration={formData.duration}
          price={formData.price}
          onNameChange={handleNameChange}
          onLimitChange={handleLimitChange}
          onInstructorNameChange={handleInstructorNameChange}
          onScheduleChange={handleScheduleChange}
          onDurationChange={handleDurationChange}
          onPriceChange={handlePriceChange}
          onCreateOrUpdateClass={handleCreateOrUpdateClass}
          isEditMode={isEditMode}
        />
      </Sheet>
    </div>
  );
}
