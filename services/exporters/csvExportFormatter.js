function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a report payload into CSV format
 * @param {Object} payload
 * @returns {{ mimeType: string, extension: string, content: string }}
 */
function formatCsvReport(payload) {
  const rows = [
    ['WILDGUARD CONSERVATION SYSTEM - ANALYTICS REPORT'],
    ['Report ID', escapeCsv(payload?.reportId || '')],
    ['Report Type', escapeCsv(payload?.reportType || '')],
    ['Status', escapeCsv(payload?.status || '')],
    ['Total Incidents', payload?.totalIncidents ?? 0],
    ['Coverage Score (%)', payload?.patrolCoverage?.coverageScore ?? 0],
    ['Coverage Gap (%)', payload?.patrolCoverage?.coverageGap ?? 0],
    [],
    ['Zone Name', 'Patrol Count'],
  ];

  (payload?.patrolCoverage?.zones || []).forEach((z) => {
    rows.push([escapeCsv(z.name), z.patrols]);
  });

  rows.push([], ['Location / Sector', 'Incident Count', 'Severity', 'Density']);
  (payload?.hotspots || []).forEach((h) => {
    rows.push([escapeCsv(h.location), h.count, escapeCsv(h.severity), h.density]);
  });

  if (payload?.recentIncidents && payload.recentIncidents.length > 0) {
    rows.push([], ['Incident ID', 'Date', 'Type', 'Location', 'Severity', 'Ranger']);
    payload.recentIncidents.forEach((inc) => {
      rows.push([
        escapeCsv(inc.id),
        escapeCsv(inc.date),
        escapeCsv(inc.type),
        escapeCsv(inc.location),
        escapeCsv(inc.severity),
        escapeCsv(inc.ranger),
      ]);
    });
  }

  return {
    mimeType: 'text/csv',
    extension: '.csv',
    content: rows.map((r) => r.join(',')).join('\n'),
  };
}

module.exports = {
  formatCsvReport,
};
