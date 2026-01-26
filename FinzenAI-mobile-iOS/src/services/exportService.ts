/**
 * Export Service - Servicio de exportación de datos
 * Maneja la generación de PDFs y CSVs para exportar datos de la app
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Image } from 'react-native';
import { Asset } from 'expo-asset';

import { logger } from '../utils/logger';

// Cache del logo en base64
let logoBase64Cache: string | null = null;

// Referencia al logo para que Metro lo incluya en el bundle
const logoSource = require('../assets/logo.png');

const getLogoBase64 = async (): Promise<string> => {
  if (logoBase64Cache) return logoBase64Cache;

  try {
    // Método 1: Usar Asset.loadAsync
    const [asset] = await Asset.loadAsync(logoSource);

    logger.log('[ExportService] Asset cargado:', {
      localUri: asset?.localUri,
      uri: asset?.uri,
      downloaded: asset?.downloaded,
      name: asset?.name
    });

    // En Android, a veces localUri es null pero uri está disponible
    let assetUri = asset?.localUri || asset?.uri;

    // Si no hay URI, intentar con Image.resolveAssetSource
    if (!assetUri) {
      const resolved = Image.resolveAssetSource(logoSource);
      logger.log('[ExportService] Resolved asset source:', resolved);
      assetUri = resolved?.uri;
    }

    if (assetUri) {
      // Si es una URI de archivo local, leer directamente
      if (assetUri.startsWith('file://') || assetUri.startsWith('/')) {
        const base64 = await FileSystem.readAsStringAsync(assetUri, {
          encoding: 'base64',
        });
        logoBase64Cache = `data:image/png;base64,${base64}`;
        logger.log('[ExportService] Logo cargado desde archivo local');
        return logoBase64Cache;
      }

      // Si es una URI remota (http/https), descargar primero
      if (assetUri.startsWith('http')) {
        const localPath = FileSystem.cacheDirectory + 'logo_temp_' + Date.now() + '.png';
        const downloadResult = await FileSystem.downloadAsync(assetUri, localPath);

        if (downloadResult.status === 200) {
          const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
            encoding: 'base64',
          });
          logoBase64Cache = `data:image/png;base64,${base64}`;
          logger.log('[ExportService] Logo descargado y convertido a base64');
          return logoBase64Cache;
        } else {
          logger.warn('[ExportService] Error descargando logo, status:', downloadResult.status);
        }
      }

      // Si es un asset bundled (asset://)
      if (assetUri.startsWith('asset://') || assetUri.includes('asset_')) {
        // Intentar descargar del bundle
        const localPath = FileSystem.cacheDirectory + 'logo_bundle_' + Date.now() + '.png';
        try {
          await asset.downloadAsync();
          const downloadedUri = asset.localUri;
          if (downloadedUri) {
            const base64 = await FileSystem.readAsStringAsync(downloadedUri, {
              encoding: 'base64',
            });
            logoBase64Cache = `data:image/png;base64,${base64}`;
            logger.log('[ExportService] Logo cargado desde bundle');
            return logoBase64Cache;
          }
        } catch (bundleError) {
          logger.warn('[ExportService] Error cargando desde bundle:', bundleError);
        }
      }
    }

    logger.warn('[ExportService] No se pudo obtener URI del asset del logo, URI:', assetUri);
  } catch (error) {
    logger.error('[ExportService] Error cargando logo para PDF:', error);
  }

  return '';
};

// Tipo de acción de exportación
export type ExportAction = 'share' | 'save';
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
  format?: (value: any, row?: Record<string, any>) => string;
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

// Color de marca FinZen AI (azul marino del logo)
const BRAND_COLOR = '#2B4C7E';

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
      border-bottom: 2px solid ${BRAND_COLOR};
    }
    .logo-img {
      width: 120px;
      height: auto;
      margin-bottom: 10px;
    }
    .logo-text {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 8px;
      font-family: 'Georgia', serif;
    }
    .logo-fin {
      color: ${BRAND_COLOR};
    }
    .logo-zen {
      color: #6B9E78;
      font-style: italic;
    }
    .logo-ai {
      color: ${BRAND_COLOR};
      font-size: 20px;
      margin-left: 4px;
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
      background-color: ${BRAND_COLOR};
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
          // Pasar el row completo a la función format
          const formattedValue = col.format ? col.format(value, row) : value;
          // Manejar null/undefined
          const displayValue = formattedValue === null || formattedValue === undefined ? '' : formattedValue;
          return `<td class="text-${col.align || 'left'}">${displayValue}</td>`;
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
  tableData: ExportTableData,
  logoBase64?: string
): string => {
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Si hay logo base64, usar imagen; sino usar texto estilizado
  const logoHTML = logoBase64
    ? `<img src="${logoBase64}" class="logo-img" alt="FinZen AI" />`
    : `<div class="logo-text"><span class="logo-fin">Fin</span><span class="logo-zen">Zen</span><span class="logo-ai">AI</span></div>`;

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
          ${logoHTML}
          <div class="title">${options.title}</div>
          ${options.subtitle ? `<div class="subtitle">${options.subtitle}</div>` : ''}
          <div class="date">Generado el ${currentDate}</div>
        </div>

        ${generateTableHTML(tableData)}
        ${generateSummaryHTML(tableData.summary || [])}

        <div class="footer">
        </div>
      </body>
    </html>
  `;
};

// ============================================
// GENERADOR CSV
// ============================================

const generateCSV = (tableData: ExportTableData): string => {
  // UTF-8 BOM para que Excel reconozca los acentos correctamente
  const BOM = '\uFEFF';

  // Header row
  const headers = tableData.columns.map(col => `"${col.header}"`).join(',');

  // Data rows
  const rows = tableData.rows.map(row => {
    return tableData.columns
      .map(col => {
        const value = row[col.key];

        // Manejar null/undefined
        if (value === null || value === undefined) {
          return '""';
        }

        // Aplicar formato pasando el valor Y la fila completa
        const formattedValue = col.format ? col.format(value, row) : value;

        // Manejar null/undefined del valor formateado
        if (formattedValue === null || formattedValue === undefined) {
          return '""';
        }

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

  return BOM + headers + '\n' + rows.join('\n') + summarySection;
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
 * Comparte archivo para que el usuario pueda guardarlo
 */
const shareFile = async (
  sourceUri: string,
  filename: string,
  mimeType: string
): Promise<ExportResult> => {
  try {
    const sharingAvailable = await Sharing.isAvailableAsync();

    if (sharingAvailable) {
      await Sharing.shareAsync(sourceUri, {
        mimeType,
        dialogTitle: `Guardar ${filename}`,
      });
      return {
        success: true,
        message: 'Selecciona "Guardar en archivos" para guardar',
        filePath: sourceUri,
      };
    } else {
      return {
        success: false,
        message: 'No es posible compartir archivos en este dispositivo',
      };
    }
  } catch (error: any) {
    logger.error('Error compartiendo archivo:', error);
    return {
      success: false,
      message: 'No se pudo compartir el archivo',
    };
  }
};

/**
 * Exporta datos a PDF
 */
export const exportToPDF = async (
  options: ExportOptions,
  tableData: ExportTableData,
  action: ExportAction = 'share'
): Promise<ExportResult> => {
  try {
    // Intentar cargar el logo
    const logo = await getLogoBase64();
    const html = generatePDFHTML(options, tableData, logo);

    // Generar PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    if (action === 'save') {
      return await shareFile(uri, `${options.filename}.pdf`, 'application/pdf');
    } else {
      // Compartir
      const sharingAvailable = await Sharing.isAvailableAsync();

      if (sharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Compartir ${options.title}`,
          UTI: 'com.adobe.pdf',
        });

        return {
          success: true,
          message: 'PDF compartido correctamente',
          filePath: uri,
        };
      } else {
        return {
          success: false,
          message: 'No es posible compartir archivos en este dispositivo',
        };
      }
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
 * Exporta datos a CSV
 */
export const exportToCSV = async (
  options: ExportOptions,
  tableData: ExportTableData,
  action: ExportAction = 'share'
): Promise<ExportResult> => {
  try {
    const csv = generateCSV(tableData);

    // Guardar archivo CSV temporal
    const csvDir = FileSystem.documentDirectory;
    const fileUri = `${csvDir}${options.filename}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: 'utf8',
    });

    if (action === 'save') {
      return await shareFile(fileUri, `${options.filename}.csv`, 'text/csv');
    } else {
      // Compartir
      const sharingAvailable = await Sharing.isAvailableAsync();

      if (sharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Compartir ${options.title}`,
          UTI: 'public.comma-separated-values-text',
        });

        return {
          success: true,
          message: 'CSV compartido correctamente',
          filePath: fileUri,
        };
      } else {
        return {
          success: false,
          message: 'No es posible compartir archivos en este dispositivo',
        };
      }
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
  tableData: ExportTableData,
  action: ExportAction = 'share'
): Promise<ExportResult> => {
  if (options.format === 'pdf') {
    return exportToPDF(options, tableData, action);
  } else {
    return exportToCSV(options, tableData, action);
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

// Exportar función de logo para uso en otros componentes
export { getLogoBase64 };

// Exportar el servicio como objeto para facilitar uso
export const ExportService = {
  canShare,
  exportToPDF,
  exportToCSV,
  exportData,
  formatCurrencyForExport,
  formatNumberForExport,
  formatDateForExport,
  getLogoBase64,
};

export default ExportService;
