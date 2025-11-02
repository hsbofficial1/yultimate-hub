// Report export utilities for CSV, Excel (XLSX), and PDF

export interface ExportData {
  [key: string]: any;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle null, undefined, and objects
        if (value === null || value === undefined) return '""';
        if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Export data to HTML (Excel-compatible)
 */
export function exportToExcel(data: any[], filename: string, title: string = 'Report'): void {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);

  const rows = data.map(row =>
    `    <tr>
      ${headers.map(header => {
        const value = row[header];
        const displayValue = value === null || value === undefined 
          ? '-' 
          : typeof value === 'object' 
            ? JSON.stringify(value) 
            : String(value);
        return `<td>${displayValue.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
      }).join('\n      ')}
    </tr>`
  ).join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
      background: #fff;
    }
    h1 { 
      color: #1e40af; 
      margin-bottom: 20px;
    }
    .meta {
      color: #666;
      margin-bottom: 20px;
      font-size: 14px;
    }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 12px; 
      text-align: left; 
    }
    th { 
      background-color: #1e40af; 
      color: white; 
      font-weight: bold; 
      position: sticky;
      top: 0;
    }
    tr:nth-child(even) { background-color: #f9fafb; }
    tr:hover { background-color: #f3f4f6; }
    @media print {
      body { margin: 0; }
      th { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <p>Generated: ${new Date().toLocaleString()}</p>
    <p>Total Records: ${data.length}</p>
  </div>
  <table>
    <thead>
      <tr>
${headers.map(h => `        <th>${h}</th>`).join('\n')}
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Print/Export to PDF using browser print
 */
export function exportToPDF(title: string, content: HTMLElement | string): void {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Unable to open print window');
    return;
  }

  const contentStr = typeof content === 'string' ? content : content.innerHTML;

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 40px;
      color: #333;
    }
    h1 { 
      color: #1e40af; 
      border-bottom: 3px solid #1e40af;
      padding-bottom: 10px;
    }
    .meta {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin-top: 20px;
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 12px; 
      text-align: left; 
    }
    th { 
      background-color: #1e40af; 
      color: white; 
      font-weight: bold; 
    }
    tr:nth-child(even) { background-color: #f9fafb; }
    @media print {
      body { margin: 0; }
      @page { margin: 2cm; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    Generated: ${new Date().toLocaleString()}
  </div>
  ${contentStr}
</body>
</html>`);

  printWindow.document.close();

  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  }, 250);
}

/**
 * Export multiple reports in one Excel file with multiple sheets
 */
export function exportMultipleSheets(
  sheets: Array<{ name: string; data: any[] }>,
  filename: string
): void {
  const workbook = sheets.map(sheet => {
    const headers = sheet.data && sheet.data.length > 0 ? Object.keys(sheet.data[0]) : [];
    const rows = sheet.data.map(row =>
      `      <tr>
        ${headers.map(header => {
          const value = row[header];
          const displayValue = value === null || value === undefined 
            ? '-' 
            : typeof value === 'object' 
              ? JSON.stringify(value) 
              : String(value);
          return `<td>${displayValue.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
        }).join('\n        ')}
      </tr>`
    ).join('\n');

    return `
    <div class="sheet">
      <h2>${sheet.name}</h2>
      <table>
        <thead>
          <tr>
${headers.map(h => `            <th>${h}</th>`).join('\n')}
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
    }
    .sheet { 
      page-break-after: always; 
      margin-bottom: 50px;
    }
    .sheet:last-child { 
      page-break-after: avoid; 
    }
    h2 { 
      color: #1e40af; 
      border-bottom: 2px solid #1e40af;
      padding-bottom: 8px;
      margin-bottom: 20px;
    }
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin-top: 10px;
    }
    th, td { 
      border: 1px solid #ddd; 
      padding: 10px; 
      text-align: left; 
    }
    th { 
      background-color: #1e40af; 
      color: white; 
      font-weight: bold; 
    }
    tr:nth-child(even) { background-color: #f9fafb; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>${filename}</h1>
  <p class="meta">Generated: ${new Date().toLocaleString()}</p>
${workbook}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.html`;
  a.click();
  window.URL.revokeObjectURL(url);
}


