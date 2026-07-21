"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToggleGroupContextValue {
  type: "single" | "multiple";
  value: string | string[];
  onValueChange: (value: string) => void;
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  type: "single",
  value: "",
  onValueChange: () => {},
});

interface ToggleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  type: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: any) => void;
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ type, value, defaultValue, onValueChange, className, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState<string | string[]>(
      defaultValue ?? (type === "multiple" ? [] : ""),
    );

    const controlled = value !== undefined;
    const currentValue = controlled ? value! : internalValue;

    const handleChange = (itemValue: string) => {
      if (type === "single") {
        const next = currentValue === itemValue ? "" : itemValue;
        if (!controlled) setInternalValue(next);
        onValueChange?.(next);
      } else {
        const arr = currentValue as string[];
        const next = arr.includes(itemValue)
          ? arr.filter((v) => v !== itemValue)
          : [...arr, itemValue];
        if (!controlled) setInternalValue(next);
        onValueChange?.(next);
      }
    };

    return (
      <ToggleGroupContext.Provider value={{ type, value: currentValue, onValueChange: handleChange }}>
        <div
          ref={ref}
          role="group"
          className={cn("flex items-center gap-1", className)}
          {...props}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  },
);
ToggleGroup.displayName = "ToggleGroup";

interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, className, children, ...props }, ref) => {
    const ctx = React.useContext(ToggleGroupContext);
    const isActive =
      ctx.type === "single"
        ? ctx.value === value
        : (ctx.value as string[]).includes(value);

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isActive}
        onClick={() => ctx.onValueChange(value)}
        className={cn(
          "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors",
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          isActive && "bg-accent text-accent-foreground border-accent",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
ToggleGroupItem.displayName = "ToggleGroupItem";

export { ToggleGroup, ToggleGroupItem };
