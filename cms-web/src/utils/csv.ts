/**
 * CSV Export Utility
 * Generates and downloads CSV files from tabular data
 */

/**
 * Escape CSV field value (handles commas, quotes, line breaks)
 */
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Convert rows to CSV string
 */
function rowsToCsvString(rows: (string | number | null | undefined)[][]): string {
  return rows
    .map(row => row.map(escapeCsvValue).join(','))
    .join('\n');
}

/**
 * Download CSV file to user's browser
 */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
  const csvContent = rowsToCsvString(rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Export array of objects to CSV file
 */
export function exportToCsv(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const rows: (string | number | null | undefined)[][] = [
    headers,
    ...data.map(row => headers.map(h => row[h] as string | number | null | undefined))
  ];
  
  downloadCsv(`${filename}.csv`, rows);
}
