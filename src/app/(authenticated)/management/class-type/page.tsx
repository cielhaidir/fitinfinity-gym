"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { Plus } from "lucide-react";
import { api } from "@/trpc/react";
import { ClassTypeForm } from "./class-type-form";
import { ClassTypeTable } from "./class-type-table";
import { toast } from "sonner";

export default function ClassTypePage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingClassType, setEditingClassType] = useState<{
    id: string;
    name: string;
    icon: string;
    description: string;
    level: string;
    isActive: boolean;
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [isActive, setIsActive] = useState(true);

  const utils = api.useUtils();

  // Queries
  const { data: classTypes = [], isLoading } = api.classType.listAll.useQuery();

  // Mutations
  const createMutation = api.classType.create.useMutation({
    onSuccess: () => {
      toast.success("Class type created successfully!");
      resetForm();
      setIsSheetOpen(false);
      utils.classType.listAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create class type: ${error.message}`);
    },
  });

  const updateMutation = api.classType.update.useMutation({
    onSuccess: () => {
      toast.success("Class type updated successfully!");
      resetForm();
      setIsSheetOpen(false);
      utils.classType.listAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update class type: ${error.message}`);
    },
  });

  const deleteMutation = api.classType.delete.useMutation({
    onSuccess: () => {
      toast.success("Class type deleted successfully!");
      utils.classType.listAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete class type: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setIcon("");
    setDescription("");
    setLevel("Medium");
    setIsActive(true);
    setEditingClassType(null);
  };

  const handleCreateOrUpdate = () => {
    if (!name.trim() || !icon.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingClassType) {
      updateMutation.mutate({
        id: editingClassType.id,
        name: name.trim(),
        icon: icon.trim(),
        description: description.trim(),
        level,
        isActive,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        icon: icon.trim(),
        description: description.trim(),
        level,
      });
    }
  };

  const handleEdit = (classType: {
    id: string;
    name: string;
    icon: string;
    description: string;
    level: string;
    isActive: boolean;
  }) => {
    setEditingClassType(classType);
    setName(classType.name);
    setIcon(classType.icon);
    setDescription(classType.description);
    setLevel(classType.level as "Easy" | "Medium" | "Hard");
    setIsActive(classType.isActive);
    setIsSheetOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this class type?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleOpenSheet = () => {
    resetForm();
    setIsSheetOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Class Type Management</h1>
          <p className="text-muted-foreground">
            Manage class types with their icons, descriptions, and difficulty levels
          </p>
        </div>
        
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button onClick={handleOpenSheet} className="bg-infinity">
              <Plus className="mr-2 h-4 w-4" />
              Add Class Type
            </Button>
          </SheetTrigger>
          
          <ClassTypeForm
            name={name}
            icon={icon}
            description={description}
            level={level}
            isActive={isActive}
            onNameChange={setName}
            onIconChange={setIcon}
            onDescriptionChange={setDescription}
            onLevelChange={setLevel}
            onIsActiveChange={setIsActive}
            onSubmit={handleCreateOrUpdate}
            onCancel={() => setIsSheetOpen(false)}
            isEditMode={!!editingClassType}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </Sheet>
      </div>

      <ClassTypeTable
        data={classTypes}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}