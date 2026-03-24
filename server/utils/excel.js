const ExcelJS = require('exceljs');

const HEADER_BG = '1E3A5F';    // deep navy
const HEADER_FG = 'FFFFFF';
const ROW_ODD   = 'FFFFFF';
const ROW_EVEN  = 'EFF6FF';

const STATUS_COLORS = {
  Paid:                { bg: '27AE60', fg: 'FFFFFF' },
  Pending:             { bg: 'F39C12', fg: 'FFFFFF' },
  Unpaid:              { bg: 'E74C3C', fg: 'FFFFFF' },
  'Invalid Screenshot':{ bg: '95A5A6', fg: 'FFFFFF' },
};

function borderAll(cell) {
  cell.border = {
    top:    { style: 'thin', color: { argb: 'D0D7DE' } },
    left:   { style: 'thin', color: { argb: 'D0D7DE' } },
    bottom: { style: 'thin', color: { argb: 'D0D7DE' } },
    right:  { style: 'thin', color: { argb: 'D0D7DE' } },
  };
}

async function generateExcel(submissions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator  = 'TCTS Association System';
  workbook.created  = new Date();

  // ── Sheet 1: Submissions ────────────────────────────────────────────────────
  const ws = workbook.addWorksheet('Submissions', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  // Title row (row 1)
  ws.mergeCells('A1:O1');
  const titleCell = ws.getCell('A1');
  titleCell.value =
    'TELANGANA COMMERCIAL TAXES S.C./S.T. EMPLOYEES ASSOCIATION – Submissions';
  titleCell.font  = { bold: true, size: 14, color: { argb: HEADER_FG } };
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // Column definitions
  ws.columns = [
    { key: 'sno',                    width: 6  },
    { key: 'name',                   width: 22 },
    { key: 'parentsName',            width: 22 },
    { key: 'religion',               width: 12 },
    { key: 'caste',                  width: 12 },
    { key: 'maritalStatus',          width: 14 },
    { key: 'designation',            width: 22 },
    { key: 'division',               width: 18 },
    { key: 'circle',                 width: 18 },
    { key: 'educationQualifications',width: 26 },
    { key: 'residenceAddress',       width: 32 },
    { key: 'interests',              width: 26 },
    { key: 'extractedAmount',        width: 20 },
    { key: 'paymentStatus',          width: 18 },
    { key: 'submittedAt',            width: 22 },
  ];

  const HEADERS = [
    'S.No', 'Name', "Parent's Name", 'Religion', 'Caste', 'Marital Status',
    'Designation', 'Division', 'Circle', 'Education Qualifications',
    'Residence Address', 'Interests / Hobbies',
    'Extracted Amount (₹)', 'Payment Status', 'Submitted At',
  ];

  // Header row (row 2)
  const headerRow = ws.addRow(HEADERS);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font      = { bold: true, color: { argb: HEADER_FG }, size: 10 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2C3E50' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    borderAll(cell);
  });

  // Data rows
  submissions.forEach((sub, idx) => {
    const isEven = idx % 2 === 0;
    const row = ws.addRow({
      sno:                    idx + 1,
      name:                   sub.name,
      parentsName:            sub.parentsName,
      religion:               sub.religion,
      caste:                  sub.caste,
      maritalStatus:          sub.maritalStatus,
      designation:            sub.designation || '—',
      division:               sub.division    || '—',
      circle:                 sub.circle      || '—',
      educationQualifications:sub.educationQualifications,
      residenceAddress:       sub.residenceAddress,
      interests:              sub.interests   || '—',
      extractedAmount:        sub.extractedAmount != null ? sub.extractedAmount : 'N/A',
      paymentStatus:          sub.paymentStatus,
      submittedAt:            new Date(sub.submittedAt).toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
    });

    row.height = 20;

    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: isEven ? ROW_EVEN : ROW_ODD },
      };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.font = { size: 10 };
      borderAll(cell);
    });

    // Colour-code the Payment Status cell
    const statusCell  = row.getCell('paymentStatus');
    const colors      = STATUS_COLORS[sub.paymentStatus] || STATUS_COLORS['Invalid Screenshot'];
    statusCell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } };
    statusCell.font   = { bold: true, color: { argb: colors.fg }, size: 10 };
    statusCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Right-align amount
    row.getCell('extractedAmount').alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell('sno').alignment             = { horizontal: 'center', vertical: 'middle' };
  });

  // ── Sheet 2: Summary ────────────────────────────────────────────────────────
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { key: 'label', width: 28 },
    { key: 'count', width: 12 },
  ];

  const paid    = submissions.filter(s => s.paymentStatus === 'Paid').length;
  const pending = submissions.filter(s => s.paymentStatus === 'Pending').length;
  const unpaid  = submissions.filter(s => s.paymentStatus === 'Unpaid').length;
  const invalid = submissions.filter(s => s.paymentStatus === 'Invalid Screenshot').length;

  const summaryData = [
    ['Total Submissions',      submissions.length],
    ['Paid',                   paid],
    ['Pending',                pending],
    ['Unpaid',                 unpaid],
    ['Invalid Screenshot',     invalid],
    ['Generated On',           new Date().toLocaleString('en-IN')],
  ];

  const summaryHeader = summary.addRow(['Description', 'Count / Value']);
  summaryHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FG } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    borderAll(cell);
  });
  summaryHeader.height = 26;

  summaryData.forEach(([label, value]) => {
    const r = summary.addRow({ label, count: value });
    r.eachCell((cell) => { borderAll(cell); cell.font = { size: 11 }; });
  });

  return workbook;
}

module.exports = { generateExcel };
