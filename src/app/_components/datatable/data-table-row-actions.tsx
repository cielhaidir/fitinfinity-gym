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

interface ActionItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  actions?: ActionItem[];
  // Keep these for backward compatibility
  onEdit?: ((item: TData) => void) | null;
  onDelete?: ((item: TData) => void) | null;
  customActions?: { label: string, action: (item: TData) => void }[];
  showEdit?: boolean;
}

export function DataTableRowActions<TData>({ 
  row, 
  actions,
  onEdit, 
  onDelete, 
  customActions,
  showEdit = true 
}: DataTableRowActionsProps<TData>) {
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [actionToDelete, setActionToDelete] = useState<ActionItem | null>(null);

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
    if (actionToDelete) {
      actionToDelete.onClick();
    } else if (onDelete) {
      onDelete(row.original);
    }
    setIsAlertOpen(false);
  }
  
  // Check if we're using the new or old API
  const usingNewAPI = !!actions;

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
          {/* New API with actions array */}
          {usingNewAPI && actions?.map((action, index) => (
            <DropdownMenuItem 
              key={index}
              onClick={action.label.toLowerCase() === "delete" 
                ? () => {
                    setActionToDelete(action);
                    setIsAlertOpen(true);
                    document.body.style.pointerEvents = "";
                  }
                : action.onClick
              }
              disabled={action.disabled}
            >
              {action.label}
              {action.label.toLowerCase() === "delete" && (
                <DropdownMenuShortcut>
                  <ShortcutBadge keyChar="⌫" />
                </DropdownMenuShortcut>
              )}
            </DropdownMenuItem>
          ))}

          {/* Legacy API support */}
          {!usingNewAPI && (
            <>
              {showEdit && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(row.original)}>Edit</DropdownMenuItem>
              )}
            
              {customActions && customActions.map((customAction, index) => (
                <div key={index}>
                  <DropdownMenuItem onClick={() => customAction.action(row.original)}>{customAction.label}</DropdownMenuItem>
                </div>
              ))}

              {customActions && customActions.length > 0 && <DropdownMenuSeparator />}

              {onDelete && (
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
              )}
            </>
          )}
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

