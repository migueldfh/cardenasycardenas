import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerId?: string;
  customAction?: {
    value: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecciona...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "No se encontraron resultados.",
  className,
  triggerId,
  customAction,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const selectedOption = React.useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  // Reset search query when popover opens/closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={triggerId}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal text-left h-10", className)}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[300px] overflow-hidden flex flex-col min-w-[200px]"
        align="start"
      >
        <div className="flex items-center border-b px-3 py-2">
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 py-0 shadow-none text-sm bg-transparent"
          />
        </div>
        <div className="flex-1 overflow-y-auto max-h-[220px] p-1 space-y-0.5">
          {customAction && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                customAction.onClick();
              }}
              className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground font-medium text-primary text-left cursor-pointer"
            >
              {customAction.icon}
              <span>{customAction.label}</span>
            </button>
          )}
          
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground text-left transition-colors cursor-pointer",
                    isSelected ? "bg-accent/50 font-medium" : ""
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
