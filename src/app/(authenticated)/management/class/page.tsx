"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet } from "@/components/ui/sheet"
import { DataTable } from "@/components/datatable/data-table"
import { columns } from "./columns"
import { ClassForm } from "./class-form"
import { api } from "@/trpc/react"
import { toast } from "sonner"
import type { Class } from "./schema"

export default function ClassPage() {
    // Form state
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [selectedClass, setSelectedClass] = useState<Class | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        limit: null as number | null,
        trainerId: "",
    })

    // Table state
    const [search, setSearch] = useState("")
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const utils = api.useUtils()

    // Query with stable configuration
    const { data: classes } = api.class.list.useQuery({
        page,
        limit: pageSize,
        search,
    }, {
        staleTime: 5000,
        keepPreviousData: true
    })

    // Mutations
    const createMutation = api.class.create.useMutation()
    const updateMutation = api.class.update.useMutation()
    const deleteMutation = api.class.remove.useMutation()

    // Update form data when selected class changes
    useEffect(() => {
        if (selectedClass) {
            setFormData({
                name: selectedClass.name,
                limit: selectedClass.limit,
                trainerId: selectedClass.trainerId,
            })
        } else {
            setFormData({
                name: "",
                limit: null,
                trainerId: "",
            })
        }
    }, [selectedClass])

    // Form handlers
    const handleNameChange = (name: string) => {
        setFormData(prev => ({ ...prev, name }))
    }

    const handleLimitChange = (limit: number | null) => {
        setFormData(prev => ({ ...prev, limit }))
    }

    const handleTrainerChange = (trainerId: string) => {
        setFormData(prev => ({ ...prev, trainerId }))
    }

    const handleCreateOrUpdateClass = async () => {
        try {
            if (isEditMode && selectedClass) {
                await updateMutation.mutateAsync({
                    id: selectedClass.id!,
                    ...formData,
                })
                toast.success("Class updated successfully!")
            } else {
                await createMutation.mutateAsync(formData)
                toast.success("Class created successfully!")
            }

            // Reset form and close sheet
            setIsSheetOpen(false)
            setIsEditMode(false)
            setSelectedClass(null)
            setFormData({
                name: "",
                limit: null,
                trainerId: "",
            })

            // Refresh data
            await utils.class.list.invalidate()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An error occurred")
        }
    }

    const handleEdit = (class_: Class) => {
        setSelectedClass(class_)
        setIsEditMode(true)
        setIsSheetOpen(true)
    }

    const handleDelete = async (class_: Class) => {
        if (!class_.id) return

        try {
            await deleteMutation.mutateAsync({ id: class_.id })
            toast.success("Class deleted successfully!")
            await utils.class.list.invalidate()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "An error occurred")
        }
    }

    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Classes</h2>
                    <p className="text-muted-foreground">
                        Manage your fitness classes here
                    </p>
                </div>
                <Button 
                    className="mb-4 bg-infinity"
                    onClick={() => setIsSheetOpen(true)}
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Class
                </Button>
            </div>

            <DataTable
                columns={columns({
                    onEdit: handleEdit,
                    onDelete: handleDelete,
                })}
                data={classes ?? { items: [], total: 0, page: 1, limit: 10 }}
                onPaginationChange={(newPage, newLimit) => {
                    setPage(newPage)
                    setPageSize(newLimit)
                }}
                searchColumns={[
                    { id: "name", placeholder: "Search by class name..." },
                ]}
                onSearch={(value) => setSearch(value)}
            />

            <Sheet 
                open={isSheetOpen} 
                onOpenChange={(open) => {
                    if (!open) {
                        setIsSheetOpen(false)
                        setIsEditMode(false)
                        setSelectedClass(null)
                        setFormData({
                            name: "",
                            limit: null,
                            trainerId: "",
                        })
                    }
                }}
            >
                <ClassForm
                    name={formData.name}
                    limit={formData.limit}
                    trainerId={formData.trainerId}
                    onNameChange={handleNameChange}
                    onLimitChange={handleLimitChange}
                    onTrainerChange={handleTrainerChange}
                    onCreateOrUpdateClass={handleCreateOrUpdateClass}
                    isEditMode={isEditMode}
                />
            </Sheet>
        </div>
    )
} 