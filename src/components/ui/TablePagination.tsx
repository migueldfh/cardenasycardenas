import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  className = "",
}: TablePaginationProps) {
  const fromItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const toItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t mt-4 text-sm text-muted-foreground ${className}`}>
      <div className="flex items-center gap-6">
        <div className="whitespace-nowrap">
          Mostrando <span className="font-semibold text-foreground">{fromItem}</span> a{" "}
          <span className="font-semibold text-foreground">{toItem}</span> de{" "}
          <span className="font-semibold text-foreground">{totalItems}</span> registros
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs whitespace-nowrap">Filas por pág.</span>
          <Select
            value={String(itemsPerPage)}
            onValueChange={(val) => {
              onItemsPerPageChange(Number(val));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={String(itemsPerPage)} />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center font-medium text-xs mr-2">
          Pág. {currentPage} de {totalPages || 1}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hidden sm:flex"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hidden sm:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
