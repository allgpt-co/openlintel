import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

const fixedDate = new Date('2026-09-14T00:00:00Z');
const ink = '252722';
const paper = 'F5F1E9';
const unknown = 'Unresolved / not entered';

// Both export formats consume these exact authored columns, sections and rows.
export function scheduleRecords(definition, blank = false) {
  if (!definition.recordLayout || !definition.exampleNotice || !definition.exampleProvenance)
    throw new Error('A record-layout definition needs explicit example provenance.');
  const keys = definition.columns.map((column) => column.key);
  const assigned = definition.recordSections.flatMap((section) => section.keys);
  if (
    new Set(keys).size !== keys.length ||
    assigned.length !== keys.length ||
    new Set(assigned).size !== keys.length ||
    assigned.some((key) => !keys.includes(key)) ||
    definition.rows.some((row) => row.length !== keys.length)
  )
    throw new Error('Every schedule field must occur exactly once in the record sections.');
  const rows = blank ? [keys.map(() => '')] : definition.rows;
  return rows.map((row, index) => ({
    number: index + 1,
    sections: definition.recordSections.map((section) => ({
      title: section.title,
      fields: section.keys.map((key) => {
        const columnIndex = keys.indexOf(key);
        return { ...definition.columns[columnIndex], value: row[columnIndex] ?? '' };
      }),
    })),
  }));
}

function date(definition) {
  const modified = new Date(`${definition.modified}T00:00:00Z`);
  if (!Number.isFinite(modified.getTime())) throw new Error('Invalid schedule revision date.');
  return modified;
}

export async function createScheduleWorkbook(definition) {
  scheduleRecords(definition);
  const book = new ExcelJS.Workbook();
  book.creator = book.lastModifiedBy = 'OpenLintel';
  book.created = fixedDate;
  book.modified = date(definition);
  book.title = definition.title;
  book.subject = 'Private draft for practitioner review';
  function sheet(name) {
    const result = book.addWorksheet(name);
    result.columns = [{ width: 29 }, { width: 64 }];
    result.pageSetup = {
      paperSize: 1,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.45, bottom: 0.45, header: 0.15, footer: 0.2 },
    };
    result.headerFooter.oddFooter = '&LOpenLintel | Private draft - pending review &RPage &P';
    return result;
  }
  function merged(target, value, height, dark = false) {
    const row = target.addRow([value]);
    target.mergeCells(row.number, 1, row.number, 2);
    row.height = height;
    row.font = {
      name: 'Calibri',
      size: dark ? 12 : 11,
      bold: dark,
      color: { argb: dark ? 'FFFFFFFF' : `FF${ink}` },
    };
    if (dark)
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${ink}` } };
    return row;
  }
  function pageStart(target, heading, blank = false) {
    merged(target, definition.title, 38, true);
    merged(
      target,
      blank
        ? 'Blank editable record. Enter verified project facts; leave unresolved inputs blank and state the next action.'
        : definition.exampleNotice,
      66,
    );
    merged(target, heading, 30, true);
  }
  const instructions = sheet('Instructions');
  pageStart(instructions, 'Using this private draft');
  let height = 134;
  const notes = [
    ['Intended use', definition.use],
    ['Example provenance', definition.exampleProvenance],
    ['Units and unknowns', definition.unitsNote],
    [
      'Editing',
      'Duplicate Blank Template for each additional item or fixture. Enter values in the pale blue cells. Field labels and notes explain the intended distinctions. No information is uploaded.',
    ],
    [
      'Import status',
      'When opening this workbook in Google Sheets, Microsoft Excel or another editor, check field values, blank inputs, numeric validation and print breaks in your own copy. Review evidence applies only to the checked file revision.',
    ],
    [
      'Printing',
      'US Letter portrait; each record is divided into readable sections. Inspect page breaks after adding long values or new records.',
    ],
    ...definition.steps.map((step, i) => [`Step ${i + 1}`, step]),
    ...definition.columns.map((column) => [column.label, column.help]),
    ...definition.sources.map((source) => ['Reference', `${source.title}\n${source.url}`]),
  ];
  for (const [label, value] of notes) {
    const rowHeight = Math.max(42, Math.ceil(value.length / 68) * 14 + 14);
    if (height + rowHeight > 660) {
      instructions.getRow(instructions.rowCount).addPageBreak();
      pageStart(instructions, 'Instructions and field reference - continued');
      height = 134;
    }
    const row = instructions.addRow([label, value]);
    row.height = rowHeight;
    row.getCell(1).font = { bold: true };
    height += rowHeight;
  }
  for (const blank of [true, false]) {
    const target = sheet(blank ? 'Blank Template' : 'Worked Example');
    for (const record of scheduleRecords(definition, blank)) {
      for (const section of record.sections) {
        if (target.rowCount) target.getRow(target.rowCount).addPageBreak();
        pageStart(target, `Record ${record.number} / ${section.title}`, blank);
        for (const field of section.fields) {
          const row = target.addRow([field.label, field.value]);
          row.height = Math.max(43, Math.ceil(String(field.value).length / 65) * 14 + 14);
          row.getCell(1).font = { bold: true };
          const input = row.getCell(2);
          input.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: blank ? 'FFEBF3F7' : `FF${paper}` },
          };
          input.note = field.help;
          if (['money', 'number'].includes(field.type)) {
            input.dataValidation = {
              type: 'decimal',
              operator: 'greaterThanOrEqual',
              formulae: [0],
              allowBlank: true,
              showErrorMessage: true,
              errorStyle: 'stop',
              errorTitle: 'Use a non-negative number',
              error: 'Enter a number or leave unresolved inputs blank.',
            };
            if (field.type === 'money') input.numFmt = '#,##0.00;[Red](#,##0.00)';
          }
        }
      }
    }
  }
  book.eachSheet((target) => {
    target.pageSetup.printArea = `A1:B${target.rowCount}`;
    target.eachRow((row) =>
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Calibri', size: 11, color: { argb: `FF${ink}` }, ...cell.font };
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true, indent: 1 };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFD8D1C5' } } };
      }),
    );
  });
  const archive = await JSZip.loadAsync(await book.xlsx.writeBuffer());
  for (const entry of Object.values(archive.files)) entry.date = fixedDate;
  return archive.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export function createSchedulePdf(definition) {
  date(definition);
  const records = scheduleRecords(definition);
  const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: false, putOnlyUsedFonts: true });
  pdf.setProperties({
    title: definition.title,
    author: 'OpenLintel',
    subject: 'Private draft worked-example preview',
  });
  pdf.setCreationDate(`D:${definition.modified.replaceAll('-', '')}000000+00'00'`);
  pdf.setFileId(
    createHash('sha256')
      .update(
        JSON.stringify({
          id: definition.id,
          title: definition.title,
          modified: definition.modified,
          use: definition.use,
          exampleNotice: definition.exampleNotice,
          exampleProvenance: definition.exampleProvenance,
          unitsNote: definition.unitsNote,
          recordSections: definition.recordSections,
          columns: definition.columns,
          rows: definition.rows,
          sources: definition.sources,
        }),
      )
      .digest('hex')
      .slice(0, 32),
  );
  let y;
  const lines = (value, width, size) => {
    pdf.setFontSize(size);
    return pdf.splitTextToSize(String(value), width);
  };
  function start(heading, first = false) {
    if (!first) pdf.addPage('letter', 'portrait');
    pdf.setTextColor(145, 79, 56);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('OPENLINTEL / PRIVATE DRAFT - PENDING REVIEW', 36, 34);
    pdf.setTextColor(37, 39, 34);
    const title = lines(definition.title, 540, 21);
    pdf.text(title, 36, 67);
    y = 75 + title.length * 23;
    pdf.setFont('helvetica', 'normal');
    const subtitle = lines(heading, 540, 11);
    pdf.text(subtitle, 36, y);
    y += subtitle.length * 14 + 18;
  }
  function paragraph(label, value) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(label, 36, y);
    y += 17;
    pdf.setFont('helvetica', 'normal');
    const body = lines(value, 540, 10.5);
    pdf.text(body, 36, y);
    y += body.length * 13 + 19;
    if (y > 722) throw new Error('Schedule PDF cover overflow; shorten or paginate content.');
  }
  start('Illustrative worked-example preview / same records as the editable workbook', true);
  paragraph('Example status', definition.exampleNotice);
  paragraph('Intended use', definition.use);
  paragraph('Provenance', definition.exampleProvenance);
  paragraph('Units and missing information', definition.unitsNote);
  paragraph(
    'Use the workbook',
    'The companion XLSX contains Instructions, Blank Template and Worked Example. Blank values in the example remain unresolved; this PDF labels them explicitly. No product, supplier, quote, technical approval or purchasing authority is invented.',
  );
  for (const record of records) {
    for (const section of record.sections) {
      start(`Worked record ${record.number} / ${section.title}`);
      for (const field of section.fields) {
        pdf.setFont('helvetica', 'bold');
        const label = lines(field.label, 156, 10.5);
        pdf.setFont('helvetica', 'normal');
        const value = lines(field.value === '' ? unknown : field.value, 344, 11);
        const height = Math.max(43, Math.max(label.length, value.length) * 14 + 18);
        if (y + height > 724) throw new Error(`Schedule PDF record overflow: ${field.key}`);
        pdf.setFillColor(245, 241, 233);
        pdf.rect(36, y - 13, 540, height, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.text(label, 44, y + 3);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.text(value, 216, y + 3);
        y += height + 3;
      }
    }
  }
  start('Reference notes');
  paragraph(
    'How references were used',
    'These primary references informed field selection and schedule structure. The example records and wording are original teaching material. References do not validate an actual product, project or approval.',
  );
  for (const source of definition.sources) paragraph(source.title, source.url);
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page);
    pdf.setDrawColor(216, 209, 197);
    pdf.line(36, 742, 576, 742);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(
      'Illustrative data. No order or installation approval. Revision ' + definition.modified,
      36,
      757,
    );
    pdf.text(`${page} / ${pdf.getNumberOfPages()}`, 576, 757, { align: 'right' });
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
