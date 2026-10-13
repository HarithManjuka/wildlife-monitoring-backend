const { formatCsvReport } = require('./csvExportFormatter');
const { formatPdfReport } = require('./pdfExportFormatter');

const EXPORT_FORMATTERS = {
  CSV: formatCsvReport,
  PDF: formatPdfReport,
};

/**
 * Resolves appropriate export formatter for the requested format
 * @param {string} format
 * @returns {Function}
 */
function getExportFormatter(format = 'CSV') {
  const key = String(format).toUpperCase();
  return EXPORT_FORMATTERS[key] || EXPORT_FORMATTERS.CSV;
}

module.exports = {
  getExportFormatter,
  formatCsvReport,
  formatPdfReport,
};
