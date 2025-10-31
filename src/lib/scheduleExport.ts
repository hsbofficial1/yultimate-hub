/**
 * Schedule Export Utilities
 * Supports: CSV, iCal formats
 */

import { format, parseISO } from 'date-fns';

export interface ExportMatch {
  id?: string;
  team_a_name: string;
  team_b_name: string;
  scheduled_time: Date | string;
  field: string;
  pool?: string;
  round?: number;
}

/**
 * Export schedule to CSV format
 */
export function exportToCSV(matches: ExportMatch[], tournamentName: string): void {
  const headers = ['Time', 'Field', 'Team A', 'Team B', 'Pool', 'Round'];
  
  const rows = matches.map(match => {
    const time = typeof match.scheduled_time === 'string' 
      ? format(parseISO(match.scheduled_time), 'MM/dd/yyyy hh:mm a')
      : format(match.scheduled_time, 'MM/dd/yyyy hh:mm a');
    
    return [
      time,
      match.field,
      match.team_a_name,
      match.team_b_name,
      match.pool || '-',
      match.round?.toString() || '-',
    ].map(cell => `"${cell}"`).join(',');
  });

  const csv = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tournamentName}_schedule_${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Export schedule to iCal format
 */
export function exportToICal(matches: ExportMatch[], tournamentName: string, location: string = ''): void {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let ical = `BEGIN:VCALENDAR\r\n`;
  ical += `VERSION:2.0\r\n`;
  ical += `PRODID:-//Y-ULTIMATE Hub//Tournament Schedule//EN\r\n`;
  ical += `CALSCALE:GREGORIAN\r\n`;
  ical += `METHOD:PUBLISH\r\n`;

  matches.forEach(match => {
    const startDate = typeof match.scheduled_time === 'string' 
      ? new Date(match.scheduled_time)
      : match.scheduled_time;
    
    // Assume 90 minutes match duration
    const endDate = new Date(startDate.getTime() + 90 * 60000);
    
    const startTime = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const summary = `${match.team_a_name} vs ${match.team_b_name}`;
    const description = `${tournamentName} - ${summary}${match.pool ? ` (${match.pool})` : ''}`;
    const eventLocation = location || match.field;

    ical += `BEGIN:VEVENT\r\n`;
    ical += `UID:${match.id || Date.now()}-${Math.random()}@yultimate-hub\r\n`;
    ical += `DTSTAMP:${now}\r\n`;
    ical += `DTSTART:${startTime}\r\n`;
    ical += `DTEND:${endTime}\r\n`;
    ical += `SUMMARY:${summary}\r\n`;
    ical += `DESCRIPTION:${description}\r\n`;
    ical += `LOCATION:${eventLocation}\r\n`;
    ical += `STATUS:CONFIRMED\r\n`;
    ical += `END:VEVENT\r\n`;
  });

  ical += `END:VCALENDAR\r\n`;

  const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tournamentName}_schedule.ics`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Export schedule to Excel-like format (HTML table)
 */
export function exportToHTML(matches: ExportMatch[], tournamentName: string): void {
  const headers = ['Time', 'Field', 'Team A', 'Team B', 'Pool', 'Round'];
  
  const rows = matches.map(match => {
    const time = typeof match.scheduled_time === 'string' 
      ? format(parseISO(match.scheduled_time), 'MM/dd/yyyy hh:mm a')
      : format(match.scheduled_time, 'MM/dd/yyyy hh:mm a');
    
    return `    <tr>
      <td>${time}</td>
      <td>${match.field}</td>
      <td>${match.team_a_name}</td>
      <td>${match.team_b_name}</td>
      <td>${match.pool || '-'}</td>
      <td>${match.round || '-'}</td>
    </tr>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${tournamentName} Schedule</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; font-weight: bold; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>${tournamentName} Schedule</h1>
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

  const blob = new Blob([html], { type: 'text/html' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tournamentName}_schedule.html`;
  a.click();
  window.URL.revokeObjectURL(url);
}

