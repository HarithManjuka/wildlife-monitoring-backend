/**
 * Formats a report payload into PDF document content
 * @param {Object} payload
 * @returns {{ mimeType: string, extension: string, content: string }}
 */
function formatPdfReport(payload = {}, user = null) {
  const managerName = user?.name || payload?.userName || 'Park Manager';
  const content = [
    '====================================================',
    '      SMART WILDLIFE CONSERVATION SYSTEM',
    '        CONSERVATION ANALYTICS REPORT',
    '====================================================',
    `Report ID     : ${payload?.reportId || 'REP-GEN'}`,
    `Report Type   : ${payload?.reportType || 'INCIDENT_ANALYSIS'}`,
    `Generated At  : ${new Date().toISOString()}`,
    `Total Records : ${payload?.totalIncidents ?? 0}`,
    `Coverage Score: ${payload?.patrolCoverage?.coverageScore ?? 0}%`,
    '----------------------------------------------------',
    'INCIDENTS BY TYPE:',
    ...Object.entries(payload?.byType || {}).map(([t, c]) => `  ${t.padEnd(20)}: ${c}`),
    '----------------------------------------------------',
    'CRITICAL HOTSPOTS:',
    ...(payload?.hotspots || []).map((h) => `  ${h.location.padEnd(25)} [${h.severity}]: ${h.count} incidents`),
    '====================================================',
    `VERIFICATION: Verified & Signed by ${managerName} (Park Manager)`,
    '====================================================',
  ].join('\n');

  return {
    mimeType: 'application/pdf',
    extension: '.pdf',
    content,
  };
}

module.exports = {
  formatPdfReport,
};
