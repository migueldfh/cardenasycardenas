import ExcelJS from "exceljs";
import type { IProject, IRosterEntry, ISizesBreakdown } from "@/modules/finances/types";

export interface IParsedProjectExcel {
  order_number: string;
  created_at: string;
  client_name: string;
  name: string;
  unit_cost: number | null;
  status_note: string;
  target_delivery_date: string;
  mold_name: string;
  fabric_name: string;
  label_name: string;
  print_info: string;
  specifications: string;
  sizes_breakdown: ISizesBreakdown;
  roster_list: IRosterEntry[];
  total_pieces: number;
}

const CABALLERO_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const DAMA_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const INFANTIL_SIZES = ["2", "4", "6", "8", "10", "12", "14", "16"];

/**
 * Safely converts cell value to string
 */
function getCellString(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "object") {
    if (val.result !== undefined) return String(val.result).trim();
    if (val.richText) return val.richText.map((rt: any) => rt.text).join("").trim();
    if (val.text) return String(val.text).trim();
  }
  return String(val).trim();
}

/**
 * Safely converts cell value to number
 */
function getCellNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "object" && val.result !== undefined) {
    const num = Number(val.result);
    return isNaN(num) ? 0 : num;
  }
  const cleanStr = String(val).replace(/[^0-9.-]/g, "");
  const num = Number(cleanStr);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse an uploaded Excel file matching Decreto's project/work sheet format
 */
export async function parseProjectExcel(file: File): Promise<IParsedProjectExcel> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("El archivo Excel no contiene ninguna hoja de trabajo.");
  }

  const result: IParsedProjectExcel = {
    order_number: "",
    created_at: "",
    client_name: "",
    name: "",
    unit_cost: null,
    status_note: "",
    target_delivery_date: "",
    mold_name: "",
    fabric_name: "",
    label_name: "",
    print_info: "",
    specifications: "",
    sizes_breakdown: {
      Caballero: {},
      Dama: {},
      Infantil: {},
    },
    roster_list: [],
    total_pieces: 0,
  };

  const specsList: string[] = [];

  // Iterate over worksheet cells to extract headers and values
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = getCellString(cell.value);
      const textUpper = text.toUpperCase();

      // Header Key/Value pairs
      if (textUpper.includes("NO. PEDIDO") || textUpper === "NO.PEDIDO" || textUpper === "PEDIDO") {
        const nextCellVal = getCellString(row.getCell(colNumber + 1).value);
        if (nextCellVal) result.order_number = nextCellVal;
      } else if (textUpper === "FECHA") {
        const nextCellVal = getCellString(row.getCell(colNumber + 1).value);
        if (nextCellVal) result.created_at = nextCellVal;
      } else if (textUpper === "CLIENTE") {
        const nextCellVal = getCellString(row.getCell(colNumber + 1).value);
        if (nextCellVal) result.client_name = nextCellVal;
      } else if (textUpper === "PROYECTO") {
        const nextCellVal = getCellString(row.getCell(colNumber + 1).value);
        if (nextCellVal) result.name = nextCellVal;
      } else if (textUpper.includes("COSTO POR PRENDA")) {
        const nextCellVal = getCellNumber(row.getCell(colNumber + 1).value);
        if (nextCellVal > 0) result.unit_cost = nextCellVal;
      } else if (textUpper.includes("STATUS")) {
        const nextCellVal = getCellString(row.getCell(colNumber + 1).value);
        if (nextCellVal) result.status_note = nextCellVal;
      } else if (textUpper.includes("FECHA DE ENTREGA")) {
        const nextCellVal = getCellString(row.getCell(colNumber + 1).value);
        if (nextCellVal) result.target_delivery_date = nextCellVal;
      } else if (textUpper === "MODELO") {
        const nextCellVal = getCellString(row.getCell(colNumber + 1).value);
        if (nextCellVal) result.mold_name = nextCellVal;
      } else if (textUpper === "TELA") {
        const nextCellVal = getCellString(row.getCell(colNumber + 1).value);
        if (nextCellVal) result.fabric_name = nextCellVal;
      } else if (textUpper === "ETIQUETA") {
        const nextCellVal = getCellString(row.getCell(colNumber + 1).value);
        if (nextCellVal) result.label_name = nextCellVal;
      } else if (textUpper === "IMPRESION" || textUpper === "IMPRESIÓN") {
        const nextCellVal = getCellString(row.getCell(colNumber + 1).value);
        if (nextCellVal) result.print_info = nextCellVal;
      }
    });
  });

  // Find notes / callouts or specifications
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const valStr = getCellString(cell.value);
      if (
        valStr.toUpperCase().includes("CAMBIAR") ||
        valStr.toUpperCase().includes("USAR EL TONO") ||
        valStr.toUpperCase().includes("NOTA")
      ) {
        if (!specsList.includes(valStr)) {
          specsList.push(valStr);
        }
      }
    });
  });

  if (specsList.length > 0) {
    result.specifications = specsList.join(" | ");
  }

  // Scan Size Breakdown Matrix (TALLAS)
  let caballeroRowIdx = -1;
  let damaRowIdx = -1;
  let infantilRowIdx = -1;

  worksheet.eachRow((row, rowNumber) => {
    const firstColStr = getCellString(row.getCell(1).value).toUpperCase();
    const secondColStr = getCellString(row.getCell(2).value).toUpperCase();

    if (firstColStr.includes("CABALLERO") || secondColStr.includes("CABALLERO")) {
      caballeroRowIdx = rowNumber;
    } else if (firstColStr.includes("DAMA") || secondColStr.includes("DAMA")) {
      damaRowIdx = rowNumber;
    } else if (firstColStr.includes("INFANTIL") || secondColStr.includes("INFANTIL")) {
      infantilRowIdx = rowNumber;
    }
  });

  // Helper to extract matrix row
  const extractMatrixRow = (headerRowNumber: number, sizesList: string[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    if (headerRowNumber === -1) return counts;

    const headerRow = worksheet.getRow(headerRowNumber);
    const colMap: { [col: number]: string } = {};

    // Map column numbers to size labels
    headerRow.eachCell((cell, colNum) => {
      const cellStr = getCellString(cell.value).toUpperCase();
      const matchedSize = sizesList.find((s) => s === cellStr);
      if (matchedSize) {
        colMap[colNum] = matchedSize;
      }
    });

    // Check row directly below or 2 rows below for counts
    const dataRow1 = worksheet.getRow(headerRowNumber + 1);
    const dataRow2 = worksheet.getRow(headerRowNumber + 2);

    Object.entries(colMap).forEach(([colNumStr, size]) => {
      const colNum = Number(colNumStr);
      const val1 = getCellNumber(dataRow1.getCell(colNum).value);
      const val2 = getCellNumber(dataRow2.getCell(colNum).value);
      const val = val1 || val2;
      if (val > 0) {
        counts[size] = val;
      }
    });

    return counts;
  };

  if (caballeroRowIdx !== -1) {
    result.sizes_breakdown.Caballero = extractMatrixRow(caballeroRowIdx, CABALLERO_SIZES);
  }

  if (damaRowIdx !== -1) {
    result.sizes_breakdown.Dama = extractMatrixRow(damaRowIdx, DAMA_SIZES);
  }

  if (infantilRowIdx !== -1) {
    result.sizes_breakdown.Infantil = extractMatrixRow(infantilRowIdx, INFANTIL_SIZES);
  }

  // Scan Personalizado Table (Roster)
  let rosterHeaderRowNumber = -1;
  let nameColIdx = -1;
  let sizeColIdx = -1;
  let genderColIdx = -1;
  let cutColIdx = -1;
  let obsColIdx = -1;

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      const cellStr = getCellString(cell.value).toUpperCase();
      if (cellStr === "PERSONALIZADO") {
        rosterHeaderRowNumber = rowNumber;
        nameColIdx = colNumber;
      }
      if (cellStr === "TALLA" && rosterHeaderRowNumber === rowNumber) {
        sizeColIdx = colNumber;
      }
      if ((cellStr === "GENERO" || cellStr === "GÉNERO") && rosterHeaderRowNumber === rowNumber) {
        genderColIdx = colNumber;
      }
      if (cellStr === "CORTE" && rosterHeaderRowNumber === rowNumber) {
        cutColIdx = colNumber;
      }
      if (cellStr.includes("OBSERVACION") && rosterHeaderRowNumber === rowNumber) {
        obsColIdx = colNumber;
      }
    });
  });

  if (rosterHeaderRowNumber !== -1 && nameColIdx !== -1) {
    let currRowNumber = rosterHeaderRowNumber + 1;
    let keepReading = true;

    while (keepReading && currRowNumber <= worksheet.rowCount) {
      const row = worksheet.getRow(currRowNumber);
      const nameVal = getCellString(row.getCell(nameColIdx).value);

      if (!nameVal) {
        // If 3 consecutive rows are empty, stop reading
        const next1 = getCellString(worksheet.getRow(currRowNumber + 1).getCell(nameColIdx).value);
        const next2 = getCellString(worksheet.getRow(currRowNumber + 2).getCell(nameColIdx).value);
        if (!next1 && !next2) {
          keepReading = false;
          break;
        }
      } else {
        const sizeVal = sizeColIdx !== -1 ? getCellString(row.getCell(sizeColIdx).value) : "";
        const rawGender = genderColIdx !== -1 ? getCellString(row.getCell(genderColIdx).value).toUpperCase() : "";
        const cutVal = cutColIdx !== -1 ? getCellString(row.getCell(cutColIdx).value) : "";
        const obsVal = obsColIdx !== -1 ? getCellString(row.getCell(obsColIdx).value) : "";

        let category: "Caballero" | "Dama" | "Infantil" = "Caballero";
        if (rawGender.includes("MUJER") || rawGender.includes("DAMA")) {
          category = "Dama";
        } else if (rawGender.includes("INFANTIL") || rawGender.includes("NIÑO") || rawGender.includes("NIÑA")) {
          category = "Infantil";
        }

        let fullObs = obsVal;
        if (cutVal && !fullObs.includes(cutVal)) {
          fullObs = fullObs ? `${cutVal} - ${fullObs}` : cutVal;
        }

        result.roster_list.push({
          id: `roster-${result.roster_list.length + 1}`,
          name: nameVal,
          size: sizeVal || "M",
          category,
          number: fullObs, // Store cut/obs info
        });
      }
      currRowNumber++;
    }
  }

  // Calculate total pieces from matrix or roster
  let matrixTotal = 0;
  Object.values(result.sizes_breakdown).forEach((catMap) => {
    Object.values(catMap || {}).forEach((cnt) => {
      matrixTotal += Number(cnt || 0);
    });
  });

  if (matrixTotal > 0) {
    result.total_pieces = matrixTotal;
  } else if (result.roster_list.length > 0) {
    result.total_pieces = result.roster_list.length;

    // Recalculate sizes breakdown matrix if empty
    result.roster_list.forEach((entry) => {
      const cat = entry.category || "Caballero";
      const sz = entry.size || "M";
      if (!result.sizes_breakdown[cat]) {
        result.sizes_breakdown[cat] = {};
      }
      result.sizes_breakdown[cat][sz] = (result.sizes_breakdown[cat][sz] || 0) + 1;
    });
  }

  return result;
}

/**
 * Export a Decreto project to an Excel file with exact branding and formatting
 */
export async function exportProjectToExcel(project: IProject): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Decreto System";
  workbook.lastModifiedBy = "Decreto System";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("HOJA DE TRABAJO", {
    views: [{ showGridLines: true }],
  });

  // Set Column Widths
  ws.columns = [
    { width: 18 }, // A: Header Label / Talla Label
    { width: 26 }, // B: Header Value
    { width: 14 }, // C: Blank / Spacing
    { width: 10 }, // D: Sub-header
    { width: 8 },  // E: XS / Size 1
    { width: 8 },  // F: S / Size 2
    { width: 8 },  // G: M / Size 3
    { width: 8 },  // H: L / Size 4
    { width: 8 },  // I: XL / Size 5
    { width: 8 },  // J: 2XL / Size 6
    { width: 8 },  // K: 3XL / Size 7
    { width: 8 },  // L: 4XL / Size 8
    { width: 12 }, // M: Totales
    { width: 4 },  // N: Separator
    { width: 6 },  // O: NO.
    { width: 24 }, // P: PERSONALIZADO
    { width: 12 }, // Q: TALLA
    { width: 14 }, // R: GENERO
    { width: 18 }, // S: CORTE / OBSERVACIONES
  ];

  // Color Styles
  const primaryHeaderFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3B82F6" }, // Blue
  };

  const sectionFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" }, // Light gray
  };

  const orangeHighlightFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFF9800" }, // Bright Orange
  };

  const yellowHighlightFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFEB3B" }, // Yellow
  };

  const darkTableFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF475569" }, // Dark slate
  };

  const fontWhiteBold: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
  const fontDarkBold: Partial<ExcelJS.Font> = { color: { argb: "FF0F172A" }, bold: true, size: 10 };
  const fontDarkNormal: Partial<ExcelJS.Font> = { color: { argb: "FF334155" }, size: 9 };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "CBD5E1" } },
    left: { style: "thin", color: { argb: "CBD5E1" } },
    bottom: { style: "thin", color: { argb: "CBD5E1" } },
    right: { style: "thin", color: { argb: "CBD5E1" } },
  };

  // 1. Header Metadata Section (Left Top)
  const headerData = [
    ["NO. PEDIDO", project.order_number || "-"],
    ["FECHA", project.created_at ? new Date(project.created_at).toLocaleDateString("es-MX") : "-"],
    ["CLIENTE", project.client?.name || "-"],
    ["PROYECTO", project.name || "-"],
    ["COSTO POR PRENDA", project.custom_price_total || project.base_price_total ? `$${project.custom_price_total || project.base_price_total}` : "-"],
    ["STATUS (SOLO SHAZ)", project.status?.toUpperCase() || "DRAFT"],
    ["FECHA DE ENTREGA", project.target_delivery_date ? new Date(project.target_delivery_date).toLocaleDateString("es-MX") : "-"],
  ];

  headerData.forEach((pair, idx) => {
    const rIdx = idx + 1;
    const cellKey = ws.getCell(rIdx, 1);
    const cellVal = ws.getCell(rIdx, 2);

    cellKey.value = pair[0];
    cellKey.font = fontDarkBold;
    cellKey.fill = primaryHeaderFill;
    cellKey.font = fontWhiteBold;
    cellKey.border = thinBorder;

    cellVal.value = pair[1];
    cellVal.font = fontDarkBold;
    cellVal.border = thinBorder;
  });

  // Garment Details Subtable
  const details = [
    ["MODELO", project.mold_name || "-"],
    ["TELA", project.fabric_name || "-"],
    ["ETIQUETA", project.label_name || "-"],
    ["IMPRESION", project.is_sample ? "Muestra física requerida" : "Estándar"],
  ];

  details.forEach((pair, idx) => {
    const rIdx = idx + 9;
    const cellKey = ws.getCell(rIdx, 1);
    const cellVal = ws.getCell(rIdx, 2);

    cellKey.value = pair[0];
    cellKey.font = fontDarkBold;
    cellKey.fill = sectionFill;
    cellKey.border = thinBorder;

    cellVal.value = pair[1];
    cellVal.font = fontDarkNormal;
    cellVal.border = thinBorder;
  });

  // Specifications
  const specsRowKey = ws.getCell(14, 1);
  specsRowKey.value = "ESPECIFICACIONES:";
  specsRowKey.font = fontWhiteBold;
  specsRowKey.fill = primaryHeaderFill;
  specsRowKey.border = thinBorder;

  const specsRowVal = ws.getCell(14, 2);
  specsRowVal.value = project.specifications || "Sin especificaciones adicionales.";
  specsRowVal.font = fontDarkNormal;
  specsRowVal.border = thinBorder;

  // 2. Personalizado Table (Right Top - Cols O to S)
  const rostHeaderRow = 1;
  const rostCols = [
    { label: "NO.", col: 15 },
    { label: "PERSONALIZADO", col: 16 },
    { label: "TALLA", col: 17 },
    { label: "GENERO", col: 18 },
    { label: "OBSERVACIONES / CORTE", col: 19 },
  ];

  rostCols.forEach((c) => {
    const cell = ws.getCell(rostHeaderRow, c.col);
    cell.value = c.label;
    cell.font = fontWhiteBold;
    cell.fill = darkTableFill;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });

  const rosterList = project.roster_list || [];
  rosterList.forEach((entry, idx) => {
    const rIdx = rostHeaderRow + 1 + idx;

    const cellNo = ws.getCell(rIdx, 15);
    cellNo.value = idx + 1;
    cellNo.font = fontDarkNormal;
    cellNo.alignment = { horizontal: "center" };
    cellNo.border = thinBorder;

    const cellName = ws.getCell(rIdx, 16);
    cellName.value = entry.name;
    cellName.font = fontDarkBold;
    cellName.border = thinBorder;

    const cellSize = ws.getCell(rIdx, 17);
    cellSize.value = entry.size;
    cellSize.font = fontDarkNormal;
    cellSize.alignment = { horizontal: "center" };
    cellSize.border = thinBorder;

    const cellGen = ws.getCell(rIdx, 18);
    cellGen.value = entry.category || "Caballero";
    cellGen.font = fontDarkNormal;
    cellGen.alignment = { horizontal: "center" };
    cellGen.border = thinBorder;

    const cellObs = ws.getCell(rIdx, 19);
    cellObs.value = entry.number || "";
    cellObs.font = fontDarkNormal;
    cellObs.border = thinBorder;
  });

  // Callout Note Box in Middle (Cols O to S if notes exist)
  if (project.specifications) {
    const noteStartRow = Math.max(16, rostHeaderRow + rosterList.length + 2);
    ws.mergeCells(noteStartRow, 15, noteStartRow + 1, 19);
    const noteCell = ws.getCell(noteStartRow, 15);
    noteCell.value = project.specifications;
    noteCell.font = fontWhiteBold;
    noteCell.fill = orangeHighlightFill;
    noteCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  // 3. TALLAS Breakdown Matrices (Bottom Left)
  const breakdown = project.sizes_breakdown || {};
  let matrixRowStart = 16;

  // Header banner for Tallas
  const tallasTitleCell = ws.getCell(matrixRowStart, 4);
  tallasTitleCell.value = "TALLAS";
  tallasTitleCell.font = fontWhiteBold;
  tallasTitleCell.fill = primaryHeaderFill;
  tallasTitleCell.alignment = { horizontal: "center" };

  matrixRowStart++;

  // Helper to render size section (Caballero / Dama / Infantil)
  const renderSizeCategoryTable = (
    catName: string,
    sizes: string[],
    dataMap: Record<string, number>,
    startRow: number,
    catColorFill: ExcelJS.Fill
  ) => {
    // 1. Category label
    const catLabelCell = ws.getCell(startRow, 1);
    catLabelCell.value = catName.toUpperCase();
    catLabelCell.font = fontWhiteBold;
    catLabelCell.fill = catColorFill;
    catLabelCell.alignment = { horizontal: "center", vertical: "middle" };
    catLabelCell.border = thinBorder;

    // 2. Sizes columns headers
    sizes.forEach((sz, szIdx) => {
      const colNum = 5 + szIdx; // Col E is 5
      const szCell = ws.getCell(startRow, colNum);
      szCell.value = sz;
      szCell.font = fontDarkBold;
      szCell.fill = sectionFill;
      szCell.alignment = { horizontal: "center" };
      szCell.border = thinBorder;
    });

    // Totals column header
    const totHeaderCell = ws.getCell(startRow, 5 + sizes.length);
    totHeaderCell.value = "totales";
    totHeaderCell.font = fontWhiteBold;
    totHeaderCell.fill = catColorFill;
    totHeaderCell.alignment = { horizontal: "center" };
    totHeaderCell.border = thinBorder;

    // 3. Values row
    const valRowIdx = startRow + 1;
    const modelCell = ws.getCell(valRowIdx, 1);
    modelCell.value = project.mold_name || "PLAYERA CR-ML";
    modelCell.font = fontDarkNormal;
    modelCell.border = thinBorder;

    let catTotal = 0;
    sizes.forEach((sz, szIdx) => {
      const colNum = 5 + szIdx;
      const count = Number(dataMap?.[sz] || 0);
      catTotal += count;

      const countCell = ws.getCell(valRowIdx, colNum);
      countCell.value = count > 0 ? count : "";
      countCell.font = count > 0 ? fontDarkBold : fontDarkNormal;
      countCell.alignment = { horizontal: "center" };
      countCell.border = thinBorder;
      if (count > 0) {
        countCell.fill = yellowHighlightFill;
      }
    });

    const totValCell = ws.getCell(valRowIdx, 5 + sizes.length);
    totValCell.value = catTotal;
    totValCell.font = fontDarkBold;
    totValCell.alignment = { horizontal: "center" };
    totValCell.border = thinBorder;

    return valRowIdx + 2; // return next start row
  };

  let nextRow = matrixRowStart;

  // Caballero
  nextRow = renderSizeCategoryTable(
    "Caballero",
    CABALLERO_SIZES,
    breakdown.Caballero || {},
    nextRow,
    primaryHeaderFill
  );

  // Dama
  nextRow = renderSizeCategoryTable(
    "Dama",
    DAMA_SIZES,
    breakdown.Dama || {},
    nextRow,
    primaryHeaderFill
  );

  // Infantil
  nextRow = renderSizeCategoryTable(
    "Infantil",
    INFANTIL_SIZES,
    breakdown.Infantil || {},
    nextRow,
    primaryHeaderFill
  );

  // Grand Total Row
  const grandTotalRowIdx = nextRow;
  const totalLabelCell = ws.getCell(grandTotalRowIdx, 12);
  totalLabelCell.value = "TOTAL";
  totalLabelCell.font = fontWhiteBold;
  totalLabelCell.fill = darkTableFill;
  totalLabelCell.alignment = { horizontal: "center" };
  totalLabelCell.border = thinBorder;

  let grandTotal = 0;
  Object.values(breakdown).forEach((catMap) => {
    Object.values(catMap || {}).forEach((cnt) => {
      grandTotal += Number(cnt || 0);
    });
  });

  const grandTotalValCell = ws.getCell(grandTotalRowIdx, 13);
  grandTotalValCell.value = grandTotal;
  grandTotalValCell.font = fontWhiteBold;
  grandTotalValCell.fill = darkTableFill;
  grandTotalValCell.alignment = { horizontal: "center" };
  grandTotalValCell.border = thinBorder;

  // Trigger Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  const fileName = `${project.order_number || "Proyecto"}_${(project.name || "Hoja_de_Trabajo").replace(/\s+/g, "_")}.xlsx`;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
