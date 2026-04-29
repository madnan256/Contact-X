import * as React from "react";
import { format, setMonth, setYear, getMonth, getYear } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DatePickerFieldProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export default function DatePickerField({ value, onChange, placeholder = "Pick a date", className }: DatePickerFieldProps) {
  const [date, setDate] = React.useState<Date | undefined>(value);
  const [open, setOpen] = React.useState(false);
  const [showMonthYear, setShowMonthYear] = React.useState(false);
  const [viewDate, setViewDate] = React.useState<Date>(value || new Date());

  const currentMonth = getMonth(viewDate);
  const currentYear = getYear(viewDate);

  // Generate year range
  const startYear = 1940;
  const endYear = new Date().getFullYear() + 5;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const monthYearListRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (showMonthYear && monthYearListRef.current) {
      // Scroll to current year
      const activeEl = monthYearListRef.current.querySelector("[data-active='true']");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "center" });
      }
    }
  }, [showMonthYear]);

  const handleSelect = (d: Date | undefined) => {
    setDate(d);
    onChange?.(d);
    if (d) setOpen(false);
  };

  const handleMonthSelect = (monthIdx: number) => {
    setViewDate(setMonth(viewDate, monthIdx));
    setShowMonthYear(false);
  };

  const handleYearScroll = (year: number) => {
    setViewDate(setYear(viewDate, year));
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setShowMonthYear(false); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "MM/dd/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {showMonthYear ? (
          <div className="p-3 pointer-events-auto">
            {/* Month/Year header */}
            <div className="flex items-center justify-center gap-1 mb-3">
              <button
                onClick={() => handleYearScroll(currentYear - 1)}
                className="rounded-md p-1 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowMonthYear(false)}
                className="text-sm font-medium hover:text-primary transition-colors px-2"
              >
                {MONTHS[currentMonth]} {currentYear}
              </button>
              <button
                onClick={() => handleYearScroll(currentYear + 1)}
                className="rounded-md p-1 hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable month + year picker */}
            <div ref={monthYearListRef} className="max-h-[240px] overflow-y-auto">
              <div className="space-y-1">
                {years.map((year) => (
                  <React.Fragment key={year}>
                    {MONTHS.map((month, monthIdx) => {
                      const isActive = year === currentYear && monthIdx === currentMonth;
                      return (
                        <button
                          key={`${year}-${monthIdx}`}
                          data-active={isActive}
                          onClick={() => {
                            setViewDate(setYear(setMonth(viewDate, monthIdx), year));
                            setShowMonthYear(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          <span>{month}</span>
                          <span className={cn("text-xs", isActive ? "text-primary-foreground" : "text-muted-foreground")}>{year}</span>
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto">
            {/* Custom caption with clickable month/year */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <button
                onClick={() => {
                  const prev = new Date(viewDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setViewDate(prev);
                }}
                className="rounded-md p-1 hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowMonthYear(true)}
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1"
              >
                {MONTHS[currentMonth]} {currentYear}
                <ChevronRight className="h-3 w-3 rotate-90" />
              </button>
              <button
                onClick={() => {
                  const next = new Date(viewDate);
                  next.setMonth(next.getMonth() + 1);
                  setViewDate(next);
                }}
                className="rounded-md p-1 hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              month={viewDate}
              onMonthChange={setViewDate}
              className="p-3 pointer-events-auto"
              classNames={{
                caption: "hidden",
              }}
              disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
