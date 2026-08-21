"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-fit",
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-4",
        month_caption: "relative flex items-center justify-center pt-1",
        caption_label: "text-sm font-semibold text-[var(--ink)]",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "h-8 w-8 bg-transparent p-0 text-[var(--muted)] hover:bg-[var(--surface)]"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "h-8 w-8 bg-transparent p-0 text-[var(--muted)] hover:bg-[var(--surface)]"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-[0.75rem] font-semibold text-[var(--muted)]",
        week: "mt-2 flex w-full",
        day: "h-9 w-9 p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-md p-0 font-medium text-[var(--ink-soft)] hover:bg-[#edf5ef] hover:text-[#1f7668]"
        ),
        selected:
          "[&>button]:bg-[var(--accent)] [&>button]:text-white [&>button]:hover:bg-[var(--accent)] [&>button]:hover:text-white",
        today: "[&>button]:border [&>button]:border-[#d9d2c3] [&>button]:bg-[#f7f1e7]",
        outside: "[&>button]:text-[var(--muted)] [&>button]:opacity-45",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-35",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: iconClassName }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className={cn("h-4 w-4", iconClassName)} />
          ) : (
            <ChevronRightIcon className={cn("h-4 w-4", iconClassName)} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
