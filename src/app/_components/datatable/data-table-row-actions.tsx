"use client"

import type { Row } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ShortcutBadge } from "../ShorcutBadge"

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  onEdit?: ((item: TData) => void) | null
  onDelete?: ((item: TData) => void) | null
  customActions?: { label: string, action: (item: TData) => void }[] // Support multiple custom actions
}

export function DataTableRowActions<TData>({ row, onEdit, onDelete, customActions }: DataTableRowActionsProps<TData>) {
  const [isAlertOpen, setIsAlertOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Backspace") {
        e.preventDefault()
        setIsAlertOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleDelete = () => {
    onDelete?.(row.original)
    setIsAlertOpen(false)
  }
  

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          <DropdownMenuItem onClick={() => onEdit?.(row.original)}>Edit</DropdownMenuItem>
          {/* <DropdownMenuSeparator /> */}
        
          {customActions && customActions.map((customAction, index) => (
            <div key={index}>
              <DropdownMenuItem onClick={() => customAction.action(row.original)}>{customAction.label}</DropdownMenuItem>
            </div>
          ))}

          {customActions && customActions.length > 0 && <DropdownMenuSeparator />}

          <DropdownMenuItem 
              onSelect={() => {
                setIsAlertOpen(true)
                document.body.style.pointerEvents = ""
              }}>
              Delete
              <DropdownMenuShortcut>
                <ShortcutBadge keyChar="⌫" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected item from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

