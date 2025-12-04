"use client"

import * as React from "react"
import Select, { type SingleValue, type StylesConfig } from "react-select"
import { cn } from "@/lib/utils"

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

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  emptyText = "No results found.",
  disabled = false,
  className,
}: ComboboxProps) {
  const selectedOption = React.useMemo(() =>
    options.find((option) => option.value === value) || null,
    [options, value]
  )

  const handleChange = (newValue: SingleValue<ComboboxOption>) => {
    if (newValue) {
      onValueChange?.(newValue.value)
    }
  }

  // Custom styles to match shadcn/ui theme
  const customStyles: StylesConfig<ComboboxOption, false> = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'hsl(var(--background))',
      borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--input))',
      borderRadius: 'calc(var(--radius) - 2px)',
      boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--ring))' : 'none',
      minHeight: '36px',
      '&:hover': {
        borderColor: 'hsl(var(--input))',
      },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 'calc(var(--radius) - 2px)',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      zIndex: 9999,
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '4px',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? 'hsl(var(--accent))'
        : state.isFocused
        ? 'hsl(var(--accent))'
        : 'transparent',
      color: state.isSelected || state.isFocused
        ? 'hsl(var(--accent-foreground))'
        : 'hsl(var(--popover-foreground))',
      cursor: 'pointer',
      borderRadius: 'calc(var(--radius) - 4px)',
      padding: '6px 8px',
      fontSize: '14px',
      '&:active': {
        backgroundColor: 'hsl(var(--accent))',
      },
    }),
    input: (provided) => ({
      ...provided,
      color: 'hsl(var(--foreground))',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'hsl(var(--foreground))',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
      padding: '0 8px',
      '&:hover': {
        color: 'hsl(var(--foreground))',
      },
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
      padding: '0 4px',
      '&:hover': {
        color: 'hsl(var(--foreground))',
      },
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
  }

  // Create a container ref for the menu portal inside the component
  const containerRef = React.useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      style={{ position: 'relative' }}
    >
      <Select<ComboboxOption, false>
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        isDisabled={disabled}
        isSearchable
        isClearable={false}
        styles={customStyles}
        className={cn("w-full", className)}
        classNamePrefix="react-select"
        noOptionsMessage={() => emptyText}
        menuPortalTarget={null}
        menuPosition="absolute"
        menuPlacement="auto"
        menuShouldBlockScroll={false}
        closeMenuOnSelect
        blurInputOnSelect={false}
        captureMenuScroll={false}
      />
    </div>
  )
}