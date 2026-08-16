import { useState, useMemo, useEffect } from "react";
import { useLocations, useWarehouseMap } from "../hooks";
import { Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface WarehouseMapSelectorProps {
  warehouseId: string;
  selectedSection: string;
  selectedRack: string;
  selectedLevel: string;
  onChange: (loc: { section: string; rack: string; level: string }) => void;
}

export function WarehouseMapSelector({
  warehouseId,
  selectedSection,
  selectedRack,
  selectedLevel,
  onChange,
}: WarehouseMapSelectorProps) {
  const { data: locations, isLoading: loadingLocations } = useLocations(warehouseId);
  const { data: stockData, isLoading: loadingStock } = useWarehouseMap(warehouseId);

  const [activeSection, setActiveSection] = useState("");

  // Parse locations into sections, racks, levels
  const layout = useMemo(() => {
    if (!locations || locations.length === 0) return null;

    const sectionsSet = new Set<string>();
    const racksSet = new Set<string>();
    const levelsSet = new Set<string>();

    locations.forEach((loc) => {
      if (loc.section) sectionsSet.add(loc.section);
      if (loc.rack) racksSet.add(loc.rack);
      if (loc.level) levelsSet.add(loc.level);
    });

    // Helper to sort strings with numbers naturally
    const naturalSort = (a: string, b: string) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    };

    const sections = Array.from(sectionsSet).sort(naturalSort);
    const racks = Array.from(racksSet).sort(naturalSort);
    const levels = Array.from(levelsSet).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })); // High levels at top (N5 down to N1)

    return { sections, racks, levels };
  }, [locations]);

  // Set default active section when layout loads
  useEffect(() => {
    if (layout?.sections && layout.sections.length > 0) {
      if (!selectedSection || !layout.sections.includes(selectedSection)) {
        setActiveSection(layout.sections[0]);
      } else {
        setActiveSection(selectedSection);
      }
    } else {
      setActiveSection("");
    }
  }, [layout, selectedSection]);

  // Map stock by location key: `section|rack|level`
  const stockMap = useMemo(() => {
    const map: Record<string, { partNumber: string; quantity: number }[]> = {};
    if (!stockData) return map;

    stockData.forEach((item) => {
      if (item.quantity <= 0) return;
      const sec = item.section || "";
      const rck = item.rack || "";
      const lvl = item.level || "";
      const key = `${sec}|${rck}|${lvl}`;

      if (!map[key]) map[key] = [];
      map[key].push({
        partNumber: item.part_number,
        quantity: item.quantity,
      });
    });

    return map;
  }, [stockData]);

  if (!warehouseId) {
    return (
      <div className="text-xs text-muted-foreground bg-muted/20 border border-border rounded-md p-3 text-center">
        Selecciona un almacén para ver el mapa de ubicaciones.
      </div>
    );
  }

  if (loadingLocations || loadingStock) {
    return (
      <div className="flex items-center justify-center p-8 gap-2 border border-border rounded-md bg-muted/10">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Cargando mapa de ubicaciones...</span>
      </div>
    );
  }

  if (!layout || layout.sections.length === 0) {
    return (
      <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/40 rounded-md p-4 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold">
          <Info className="h-4 w-4" />
          <span>Almacén sin Diseño Registrado</span>
        </div>
        <p>
          Este almacén no tiene cuadrículas o racks pre-configurados en el sistema. 
          Los campos de sección, rack y nivel deberán completarse manualmente.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/10 space-y-4">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          Mapa del Almacén ({warehouseId})
        </span>
        <p className="text-[11px] text-muted-foreground">
          Haz clic en cualquier celda para seleccionar la ubicación física en la cuadrícula.
        </p>
      </div>

      {/* SECTION TABS */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border/80">
        {layout.sections.map((sec) => (
          <button
            key={sec}
            type="button"
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
              activeSection === sec
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => {
              setActiveSection(sec);
              // Update parent section immediately, but keep current rack and level if possible
              onChange({ section: sec, rack: selectedRack, level: selectedLevel });
            }}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* LEGEND */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground pt-1">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-background border border-border" />
          <span>Vacío (Disponible)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-amber-500/15 border border-amber-500/30" />
          <span>Ocupado (Con stock)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-primary/20 border-2 border-primary" />
          <span>Seleccionado</span>
        </div>
      </div>

      {/* GRID DISPLAY */}
      <div className="overflow-x-auto border border-border/60 rounded-md bg-card p-4">
        <div className="min-w-[500px] space-y-2">
          {/* Row of Rack Headers */}
          <div className="flex">
            {/* Corner header spacer for Level labels */}
            <div className="w-16 flex-shrink-0" />
            
            {/* Rack column titles */}
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${layout.racks.length}, minmax(0, 1fr))` }}>
              {layout.racks.map((rck) => (
                <div key={rck} className="text-center text-[10px] font-bold text-muted-foreground uppercase py-1">
                  {rck}
                </div>
              ))}
            </div>
          </div>

          {/* Grid Rows (Levels) */}
          {layout.levels.map((lvl) => {
            return (
              <div key={lvl} className="flex items-center">
                {/* Level Title label (e.g. N1) */}
                <div className="w-16 flex-shrink-0 text-left text-xs font-semibold text-muted-foreground pr-2">
                  {lvl}
                </div>

                {/* Level cells for each rack */}
                <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${layout.racks.length}, minmax(0, 1fr))` }}>
                  {layout.racks.map((rck) => {
                    const key = `${activeSection}|${rck}|${lvl}`;
                    const itemsInLocation = stockMap[key] || [];
                    const hasStock = itemsInLocation.length > 0;
                    
                    const isSelected = 
                      selectedSection === activeSection && 
                      selectedRack === rck && 
                      selectedLevel === lvl;

                    // Tooltip text formatting
                    const tooltipText = hasStock
                      ? `Ubicación: ${activeSection} / ${rck} / ${lvl}\n` + 
                        itemsInLocation.map(item => `• SKU ${item.partNumber}: ${item.quantity} uds`).join("\n")
                      : `Ubicación vacía: ${activeSection} / ${rck} / ${lvl}`;

                    return (
                      <button
                        key={rck}
                        type="button"
                        title={tooltipText}
                        className={cn(
                          "aspect-[2/1] rounded flex flex-col items-center justify-center text-[9px] border transition-all relative overflow-hidden select-none hover:scale-[1.03] active:scale-[0.98]",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary-foreground font-semibold ring-1 ring-primary/40"
                            : hasStock
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
                            : "border-border bg-background hover:bg-accent/50 text-muted-foreground"
                        )}
                        onClick={() => {
                          onChange({ section: activeSection, rack: rck, level: lvl });
                        }}
                      >
                        {/* Selected Indicator Dot */}
                        {isSelected && (
                          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                        )}

                        {/* Level/Rack abbreviation text */}
                        <span className="opacity-90 font-mono">
                          {lvl}-{rck.replace("RACK ", "")}
                        </span>

                        {/* Mini indicator badge for stock */}
                        {hasStock && (
                          <span className="text-[7px] text-amber-600 dark:text-amber-400 font-bold block scale-90">
                            {itemsInLocation.reduce((acc, curr) => acc + curr.quantity, 0)} uds
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
