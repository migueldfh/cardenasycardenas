import ExcelJS from "exceljs";
import type { IInvoice, IProject } from "@/modules/finances/types";
import { formatLocalDate } from "@/lib/utils";

export async function exportInvoicesToExcel(invoices: IInvoice[], allProjects: IProject[]) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Facturas");

  // Colors & Fonts matching the system theme
  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" }, // Slate 900
  };

  const summaryFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8FAFC" }, // Slate 50
  };

  const fontWhiteBold: Partial<ExcelJS.Font> = {
    name: "Calibri",
    color: { argb: "FFFFFFFF" },
    bold: true,
    size: 11,
  };

  const fontDarkBold: Partial<ExcelJS.Font> = {
    name: "Calibri",
    color: { argb: "FF0F172A" },
    bold: true,
    size: 11,
  };

  const fontNormal: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 11,
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  const doubleBottomBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "double", color: { argb: "FF0F172A" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };

  // Define Columns
  ws.columns = [
    { header: "FACTURA", key: "factura", width: 18 },
    { header: "CLIENTE", key: "cliente", width: 25 },
    { header: "FECHA", key: "fecha", width: 15 },
    { header: "ESTADO", key: "estado", width: 15 },
    { header: "DESCRIPCION", key: "descripcion", width: 45 },
    { header: "MONTO", key: "monto", width: 18 },
    { header: "IVA", key: "iva", width: 18 },
    { header: "TOTAL", key: "total", width: 18 },
  ];

  // We want the summary row at the top (Row 1), header at Row 2, and data starting at Row 3.
  // exceljs automatic headers go to Row 1. We will manually clear the automatic header at Row 1
  // and construct the sheet exactly as we need.

  // Clear Row 1 values
  const row1 = ws.getRow(1);
  row1.values = [];

  // Data rows to populate
  const rowsData: any[] = [];

  invoices.forEach((invoice) => {
    // Find projects linked to this invoice
    const linkedProjects = allProjects.filter((p) => p.invoice_id === invoice.id);
    
    // Status translation for user friendliness
    const statusMap = {
      pending: "Pendiente",
      paid: "Pagada",
      cancelled: "Cancelada",
    };
    const friendlyStatus = statusMap[invoice.status] || invoice.status;

    if (linkedProjects.length === 0) {
      // If there are no projects, write a single row with invoice level values
      rowsData.push({
        factura: invoice.invoice_number,
        cliente: invoice.client?.name || "Cliente Desconocido",
        fecha: formatLocalDate(new Date(invoice.created_at)),
        estado: friendlyStatus,
        descripcion: invoice.notes || "Sin proyectos asociados",
        monto: Number(invoice.subtotal),
        iva: Number(invoice.iva),
        total: Number(invoice.total),
      });
    } else {
      // If there are projects, write a row for each project
      linkedProjects.forEach((proj) => {
        const projectSubtotal = Number(proj.custom_price_total || 0);
        const projectIva = projectSubtotal * Number(invoice.iva_rate || 0.16);
        const projectTotal = projectSubtotal + projectIva;

        rowsData.push({
          factura: invoice.invoice_number,
          cliente: invoice.client?.name || "Cliente Desconocido",
          fecha: formatLocalDate(new Date(invoice.created_at)),
          estado: friendlyStatus,
          descripcion: proj.name,
          monto: projectSubtotal,
          iva: projectIva,
          total: projectTotal,
        });
      });
    }
  });

  const lastDataRowIdx = 2 + (rowsData.length > 0 ? rowsData.length : 1);

  // Setup Row 1: Summary Row
  ws.getCell("A1").value = "TOTALES";
  ws.getCell("A1").font = fontDarkBold;
  ws.getCell("F1").value = { formula: `SUM(F3:F${lastDataRowIdx})` };
  ws.getCell("G1").value = { formula: `SUM(G3:G${lastDataRowIdx})` };
  ws.getCell("H1").value = { formula: `SUM(H3:H${lastDataRowIdx})` };

  const summaryRow = ws.getRow(1);
  summaryRow.height = 24;
  summaryRow.eachCell((cell, colNumber) => {
    cell.fill = summaryFill;
    cell.border = doubleBottomBorder;
    if (colNumber >= 6 && colNumber <= 8) {
      cell.font = fontDarkBold;
      cell.numFmt = "$#,##0.00";
      cell.alignment = { horizontal: "right", vertical: "middle" };
    } else {
      cell.alignment = { vertical: "middle" };
    }
  });

  // Setup Row 2: Header Row
  const headerRow = ws.getRow(2);
  headerRow.height = 28;
  const headers = ["FACTURA", "CLIENTE", "FECHA", "ESTADO", "DESCRIPCION", "MONTO", "IVA", "TOTAL"];
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.fill = headerFill;
    cell.font = fontWhiteBold;
    cell.alignment = {
      horizontal: index >= 5 ? "right" : index === 3 || index === 2 ? "center" : "left",
      vertical: "middle",
    };
    cell.border = thinBorder;
  });

  // Populate Data rows
  rowsData.forEach((data, index) => {
    const rowIdx = 3 + index;
    const row = ws.getRow(rowIdx);
    row.height = 20;

    row.getCell(1).value = data.factura; // FACTURA
    row.getCell(2).value = data.cliente; // CLIENTE
    row.getCell(3).value = data.fecha;   // FECHA
    row.getCell(4).value = data.estado;  // ESTADO
    row.getCell(5).value = data.descripcion; // DESCRIPCION
    row.getCell(6).value = data.monto;   // MONTO
    row.getCell(7).value = data.iva;     // IVA
    row.getCell(8).value = data.total;   // TOTAL

    row.eachCell((cell, colNumber) => {
      cell.font = fontNormal;
      cell.border = thinBorder;
      if (colNumber >= 6 && colNumber <= 8) {
        cell.numFmt = "$#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      } else if (colNumber === 3 || colNumber === 4) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
    });
  });

  // Trigger Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Reporte_Facturas_${new Date().toISOString().split("T")[0]}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
