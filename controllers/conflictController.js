// backend/controllers/conflictController.js

// Mock in-memory conflict reports queue
const mockReports = [
  {
    id: 'conf-501',
    source: 'SMS Gateway',
    village: 'Habarana North',
    threatLevel: 'Medium',
    dispatchedRanger: null,
    status: 'Triaged',
    description: 'Wild elephant herd sighted near cultivation fence',
    contact: '+94771234567',
    reportedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'conf-502',
    source: 'Community Hotline',
    village: 'Minneriya East',
    threatLevel: 'High',
    dispatchedRanger: 'Unit Alpha',
    status: 'Ranger Assigned',
    description: 'Lone bull elephant encroaching home garden',
    contact: '+94779876543',
    reportedAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

// Webhook for SMS gateway (public/unauthenticated)
exports.receiveSmsReport = (req, res) => {
  const { sender, message, village, reporterName, contact, description } = req.body;

  const newReport = {
    id: `conf-${Date.now()}`,
    source: 'SMS Gateway',
    sender: sender || contact || reporterName || 'Anonymous',
    village: village || 'Unspecified Sector',
    description: message || description || 'SMS report received',
    threatLevel: 'Pending Triage',
    dispatchedRanger: null,
    status: 'Pending Dispatch',
    reportedAt: new Date().toISOString(),
  };

  mockReports.unshift(newReport);

  res.status(201).json({
    success: true,
    message: 'SMS conflict report received and queued for triage',
    report: newReport,
  });
};

// Retrieve triage queue (Protected: LIAISON_OFFICER, PARK_MANAGER)
exports.getAllReports = (req, res) => {
  res.status(200).json({
    success: true,
    total: mockReports.length,
    reports: mockReports,
  });
};

// Assign ranger to report (Protected: LIAISON_OFFICER)
exports.assignRanger = (req, res) => {
  const { reportId } = req.params;
  const { rangerId, rangerName } = req.body;

  const report = mockReports.find((r) => r.id === reportId);

  if (!report) {
    return res.status(404).json({
      success: false,
      error: `Conflict report with ID ${reportId} not found`,
    });
  }

  report.dispatchedRanger = rangerName || rangerId || 'Dispatched Ranger';
  report.status = 'Ranger Assigned';
  report.assignedBy = req.user ? req.user.name : 'Liaison Officer';
  report.assignedAt = new Date().toISOString();

  res.status(200).json({
    success: true,
    message: `Ranger assigned successfully to conflict report ${reportId}`,
    report,
  });
};
