/**
 * Export Service - Servicio de exportación de datos
 * Maneja la generación de PDFs y CSVs para exportar datos de la app
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import { logger } from '../utils/logger';
// ============================================
// TIPOS
// ============================================

export type ExportFormat = 'pdf' | 'csv';

export interface ExportOptions {
  title: string;
  subtitle?: string;
  filename: string;
  format: ExportFormat;
}

export interface TableColumn {
  header: string;
  key: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

export interface ExportTableData {
  columns: TableColumn[];
  rows: Record<string, any>[];
  summary?: { label: string; value: string }[];
}

export interface ExportResult {
  success: boolean;
  message: string;
  filePath?: string;
}

// ============================================
// TEMPLATES HTML PARA PDF
// ============================================

const getBaseStyles = (): string => `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 40px;
      color: #1e293b;
      font-size: 12px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #2563EB;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563EB;
      margin-bottom: 5px;
    }
    .title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 12px;
      color: #64748b;
    }
    .date {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background-color: #2563EB;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    tr:hover {
      background-color: #f1f5f9;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .summary {
      margin-top: 30px;
      padding: 20px;
      background-color: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .summary-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #1e293b;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-row:last-child {
      border-bottom: none;
      font-weight: 600;
    }
    .summary-label {
      color: #64748b;
    }
    .summary-value {
      color: #1e293b;
      font-weight: 500;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
`;

// ============================================
// GENERADORES DE CONTENIDO
// ============================================

const generateTableHTML = (data: ExportTableData): string => {
  const headerRow = data.columns
    .map(col => `<th style="text-align: ${col.align || 'left'}; ${col.width ? `width: ${col.width};` : ''}">${col.header}</th>`)
    .join('');

  const bodyRows = data.rows
    .map(row => {
      const cells = data.columns
        .map(col => {
          const value = row[col.key];
          const formattedValue = col.format ? col.format(value) : value;
          return `<td class="text-${col.align || 'left'}">${formattedValue}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>${headerRow}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  `;
};

const generateSummaryHTML = (summary: { label: string; value: string }[]): string => {
  if (!summary || summary.length === 0) return '';

  const rows = summary
    .map(item => `
      <div class="summary-row">
        <span class="summary-label">${item.label}</span>
        <span class="summary-value">${item.value}</span>
      </div>
    `)
    .join('');

  return `
    <div class="summary">
      <div class="summary-title">Resumen</div>
      ${rows}
    </div>
  `;
};

const generatePDFHTML = (
  options: ExportOptions,
  tableData: ExportTableData
): string => {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${getBaseStyles()}
      </head>
      <body>
        <div class="header">
          <div class="logo">FinZen AI</div>
          <div class="title">${options.title}</div>
          ${options.subtitle ? `<div class="subtitle">${options.subtitle}</div>` : ''}
          <div class="date">Generado el ${currentDate}</div>
        </div>

        ${generateTableHTML(tableData)}
        ${generateSummaryHTML(tableData.summary || [])}

        <div class="footer">
          <p>Documento generado por FinZen AI - Tu asistente financiero inteligente</p>
          <p>Este documento es solo para fines informativos</p>
        </div>
      </body>
    </html>
  `;
};

// ============================================
// GENERADOR CSV
// ============================================

const generateCSV = (tableData: ExportTableData): string => {
  // Header row
  const headers = tableData.columns.map(col => `"${col.header}"`).join(',');

  // Data rows
  const rows = tableData.rows.map(row => {
    return tableData.columns
      .map(col => {
        const value = row[col.key];
        const formattedValue = col.format ? col.format(value) : value;
        // Escape quotes and wrap in quotes
        return `"${String(formattedValue).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  // Summary section (if exists)
  let summarySection = '';
  if (tableData.summary && tableData.summary.length > 0) {
    summarySection = '\n\nResumen\n' + tableData.summary
      .map(item => `"${item.label}","${item.value}"`)
      .join('\n');
  }

  return headers + '\n' + rows.join('\n') + summarySection;
};

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Verifica si el dispositivo puede compartir archivos
 */
export const canShare = async (): Promise<boolean> => {
  return await Sharing.isAvailableAsync();
};

/**
 * Exporta datos a PDF y abre el diálogo de compartir
 */
export const exportToPDF = async (
  options: ExportOptions,
  tableData: ExportTableData
): Promise<ExportResult> => {
  try {
    const html = generatePDFHTML(options, tableData);

    // Generar PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    // Renombrar archivo con nombre personalizado
    const pdfDir = FileSystem.documentDirectory;
    const newUri = `${pdfDir}${options.filename}.pdf`;

    await FileSystem.moveAsync({
      from: uri,
      to: newUri,
    });

    // Verificar si se puede compartir
    const sharingAvailable = await Sharing.isAvailableAsync();

    if (sharingAvailable) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Compartir ${options.title}`,
        UTI: 'com.adobe.pdf',
      });

      return {
        success: true,
        message: 'PDF exportado correctamente',
        filePath: newUri,
      };
    } else {
      return {
        success: false,
        message: 'No es posible compartir archivos en este dispositivo',
      };
    }
  } catch (error: any) {
    logger.error('Error exportando PDF:', error);
    return {
      success: false,
      message: error.message || 'Error al generar el PDF',
    };
  }
};

/**
 * Exporta datos a CSV y abre el diálogo de compartir
 */
export const exportToCSV = async (
  options: ExportOptions,
  tableData: ExportTableData
): Promise<ExportResult> => {
  try {
    const csv = generateCSV(tableData);

    // Guardar archivo CSV
    const csvDir = FileSystem.documentDirectory;
    const fileUri = `${csvDir}${options.filename}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Verificar si se puede compartir
    const sharingAvailable = await Sharing.isAvailableAsync();

    if (sharingAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: `Compartir ${options.title}`,
        UTI: 'public.comma-separated-values-text',
      });

      return {
        success: true,
        message: 'CSV exportado correctamente',
        filePath: fileUri,
      };
    } else {
      return {
        success: false,
        message: 'No es posible compartir archivos en este dispositivo',
      };
    }
  } catch (error: any) {
    logger.error('Error exportando CSV:', error);
    return {
      success: false,
      message: error.message || 'Error al generar el CSV',
    };
  }
};

/**
 * Función principal de exportación que decide el formato
 */
export const exportData = async (
  options: ExportOptions,
  tableData: ExportTableData
): Promise<ExportResult> => {
  if (options.format === 'pdf') {
    return exportToPDF(options, tableData);
  } else {
    return exportToCSV(options, tableData);
  }
};

// ============================================
// HELPERS PARA FORMATEO
// ============================================

/**
 * Formatea un número como moneda
 */
export const formatCurrencyForExport = (
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formatea un número con separadores de miles
 */
export const formatNumberForExport = (
  value: number,
  decimals: number = 2
): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Formatea una fecha
 */
export const formatDateForExport = (
  date: Date | string,
  format: 'short' | 'long' = 'short'
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'long') {
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return d.toLocaleDateString('es-ES');
};

// Exportar el servicio como objeto para facilitar uso
export const ExportService = {
  canShare,
  exportToPDF,
  exportToCSV,
  exportData,
  formatCurrencyForExport,
  formatNumberForExport,
  formatDateForExport,
};

export default ExportService;
