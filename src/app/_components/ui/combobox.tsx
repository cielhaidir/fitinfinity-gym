"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import * as Portal from "@radix-ui/react-portal"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

interface Position {
  top: number
  left: number
  width: number
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  emptyText = "No results found.",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const [position, setPosition] = React.useState<Position>({ top: 0, left: 0, width: 0 })

  const filteredOptions = React.useMemo(() => 
    options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [options, searchQuery]
  )

  const selectedOption = React.useMemo(() => 
    options.find((option) => option.value === value),
    [options, value]
  )

  const updatePosition = React.useCallback(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [open])

  const handleSelect = React.useCallback((currentValue: string) => {
    onValueChange?.(currentValue)
    setOpen(false)
    setSearchQuery("")
  }, [onValueChange])

  // Update position when dropdown opens and on resize/scroll
  React.useEffect(() => {
    if (!open) return

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    const observer = new ResizeObserver(updatePosition)
    if (buttonRef.current) {
      observer.observe(buttonRef.current)
    }

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      observer.disconnect()
    }
  }, [open, updatePosition])

  // Handle click outside
  React.useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current && !buttonRef.current.contains(target)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  // Handle escape key
  React.useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open])

  return (
    <div className="relative w-full">
      <Button
        ref={buttonRef}
        variant="outline"
        role="combobox"
        type="button"
        aria-expanded={open}
        aria-label={selectedOption?.label ?? placeholder}
        className={cn(
          "w-full justify-between",
          "transition-all duration-200",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
      >
        <span className="truncate">
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronsUpDown className={cn(
          "ml-2 h-4 w-4 shrink-0 transition-transform duration-200",
          open && "rotate-180",
          "opacity-50"
        )} />
      </Button>
      {open && (
        <Portal.Root>
          <div 
            className={cn(
              "fixed z-[100] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
              "animate-in fade-in-0 zoom-in-95"
            )}
            style={{
              position: 'absolute',
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              maxHeight: '300px'
            }}
          >
            <Command className="w-full">
              <CommandInput 
                placeholder={`Search ${placeholder.toLowerCase()}...`}
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-9"
                autoFocus
              />
              <CommandEmpty className="py-2">{emptyText}</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-auto">
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                    className="cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 transition-opacity duration-200",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </div>
        </Portal.Root>
      )}
    </div>
  )
}