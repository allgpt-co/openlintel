import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Footer, PageNumber } from 'docx';
import {
  createPresentation,
  createPresentationPdf,
  createQuestionnairePdf,
} from './presentation-assets.mjs';

export const exampleNotice =
  'Illustrative teaching extension of The Window Room; not a client record, supplier quote, site survey, or construction-ready document. Pending professional review.';
const fixedDate = new Date('2026-09-14T00:00:00Z');
const editorialDate = (definition) => {
  const date = new Date(`${definition.modified || '2026-09-14'}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid Office editorial date.');
  return date;
};

// Office archives otherwise embed the time of each build in ZIP entry headers.
async function reproducible(buffer) {
  const archive = await JSZip.loadAsync(buffer);
  for (const entry of Object.values(archive.files)) entry.date = fixedDate;
  return archive.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export function calculateBudgetRow(quantity, unitCost, additional = null, allowance = null) {
  if (quantity == null || quantity === '' || unitCost == null || unitCost === '')
    return { total: null, remaining: null };
  for (const value of [quantity, unitCost, additional, allowance])
    if (value != null && value !== '' && (!Number.isFinite(value) || value < 0))
      throw new Error('Budget inputs must be finite, non-negative numbers or blank.');
  const total = Math.round((quantity * unitCost + (additional || 0)) * 100) / 100;
  return {
    total,
    remaining:
      allowance == null || allowance === '' ? null : Math.round((allowance - total) * 100) / 100,
  };
}

export function displayRows(definition) {
  return definition.rows.map((row) => {
    if (!definition.budget) return row;
    const result = calculateBudgetRow(row[2], row[4], row[5], row[7]);
    return row.map((value, index) =>
      index === 6 ? result.total : index === 8 ? result.remaining : value,
    );
  });
}

async function workbook(definition) {
  const book = new ExcelJS.Workbook();
  book.creator = 'OpenLintel';
  book.lastModifiedBy = 'OpenLintel';
  book.created = fixedDate;
  book.modified = editorialDate(definition);
  book.title = definition.title;
  book.subject = 'Editable professional planning resource';
  book.calcProperties.fullCalcOnLoad = true;
  const instructions = book.addWorksheet('Instructions');
  instructions.columns = [{ width: 30 }, { width: 105 }];
  const notes = [
    [definition.title, 'OpenLintel • Editable XLSX resource'],
    ['How to use', definition.use],
    ['Example status', exampleNotice],
    [
      'Getting started',
      'Duplicate Blank Template for your project. Replace teaching examples with verified project information. Keep units and sources explicit. Nothing is uploaded to OpenLintel.',
    ],
    [
      'Units / currency',
      definition.budget
        ? 'Example monetary values are USD teaching figures only. Choose one currency for your own sheet. Additional allowances are entered as amounts; no tax rate is assumed.'
        : 'State units explicitly. Sample dimensions are metric and nominal, not surveyed.',
    ],
    [
      'Review',
      'These are educational planning aids, not legal agreements, professional certification, or instructions for construction.',
    ],
    [
      'Google Sheets import',
      'Upload the XLSX to your own Drive and open it in Google Sheets. Before using it, check formulas, blank-versus-zero behavior, validation, number formats and print breaks. Keep the original XLSX. ' +
        (definition.budget
          ? 'Budget calculation logic was checked in Google Sheets on September 26, 2026; review the layout of your imported copy separately.'
          : 'This workbook has not been independently checked in Google Sheets.'),
    ],
    [
      'Printing',
      'US Letter, landscape. Fit one page wide and inspect the preview; long tables may span multiple pages.',
    ],
    ...definition.steps.map((step, i) => [`Step ${i + 1}`, step]),
    ...definition.columns.map((c) => [c.label, c.help]),
    ...(definition.budget
      ? [
          [
            'Subtotal behavior',
            'Totals include known line items only. Blank quantity or unit cost leaves that line’s total unresolved. The subtotal is not a complete project estimate. Enter a deliberate zero where appropriate.',
          ],
          [
            'Formula editing',
            'Columns G and I and the subtotal row contain formulas. Input columns are editable; cells are not password-protected. Preserve or restore formulas when inserting rows.',
          ],
        ]
      : []),
  ];
  notes.forEach((r, i) => {
    const row = instructions.addRow(r);
    row.height = i === 0 ? 54 : Math.max(48, Math.ceil(r[1].length / 95) * 16 + 12);
  });
  instructions.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF252722' } };
  instructions.pageSetup = {
    paperSize: 1,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: '1:1',
    printArea: `A1:B${notes.length}`,
  };
  instructions.headerFooter.oddFooter = '&LOpenLintel | Instructions &RPage &P';
  for (const [name, example] of [
    ['Blank Template', false],
    ['Worked Example', true],
  ]) {
    const sheet = book.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 5, xSplit: 2 }] });
    const count = definition.columns.length;
    // The old 27/48-character widths reduced a ten-column printed table to
    // about five-point type. Keep screens editable and Letter printouts legible.
    sheet.columns = definition.columns.map((c, i) => ({
      width:
        i === count - 1
          ? 26
          : ['money', 'formula'].includes(c.type)
            ? 12
            : c.type === 'number'
              ? 9
              : c.label === 'Unit'
                ? 7
                : /^(Reference|Revision)$/.test(c.label)
                  ? 12
                  : /^(Selection|Item)$/.test(c.label)
                    ? 20
                    : 15,
    }));
    for (let row = 1; row <= 4; row++) sheet.mergeCells(row, 1, row, count);
    sheet.getCell('A1').value = definition.title;
    sheet.getCell('A2').value = example
      ? exampleNotice
      : 'Blank editable template • Complete with your own verified project information.';
    sheet.getCell('A3').value = definition.budget
      ? 'Currency: ' +
        (example ? 'USD — illustrative teaching figures, not quotes' : '[enter one currency]')
      : 'Units: explicitly stated per entry • Nominal example dimensions require site verification.';
    sheet.getCell('A4').value = definition.budget
      ? 'Input C, E, F, H; G and I calculate. Blank is unresolved, not zero. See Instructions.'
      : 'Read Instructions first. Keep source, status, and unresolved information visible.';
    sheet.getRow(1).font = { bold: true, size: 17, color: { argb: 'FF252722' } };
    sheet.getRow(1).height = 32;
    sheet.getRow(2).height = 38;
    sheet.getRow(3).height = 26;
    sheet.getRow(4).height = 28;
    sheet.getRow(5).values = definition.columns.map((c) => c.label);
    sheet.getRow(5).height = 38;
    sheet.getRow(5).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF252722' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });
    // Do not format unused example rows: some Office renderers include those
    // rows in print output even when a smaller print area is declared.
    const dataRows = example && !definition.budget ? Math.max(1, definition.rows.length) : 20;
    for (let i = 0; i < dataRows; i++) {
      const rowIndex = i + 6;
      const values = example ? definition.rows[i] || [] : [];
      const row = sheet.getRow(rowIndex);
      row.values = values;
      row.height =
        example && i < definition.rows.length
          ? Math.max(
              72,
              ...values.map(
                (value, index) =>
                  Math.ceil(String(value ?? '').length / (sheet.columns[index].width * 0.85)) * 14 +
                  12,
              ),
            )
          : 36;
      // Retain formula rows in the example but avoid printing an empty register.
      // The blank template keeps all twenty input rows visible.
      if (example && definition.budget && i >= definition.rows.length) row.hidden = true;
      for (let c = 1; c <= count; c++) {
        const cell = row.getCell(c);
        const column = definition.columns[c - 1];
        if (i % 2 === 0)
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F1E9' } };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFD8D1C5' } } };
        if (['number', 'money'].includes(column.type))
          cell.dataValidation = {
            type: 'decimal',
            operator: 'greaterThanOrEqual',
            formulae: [0],
            allowBlank: true,
            showErrorMessage: true,
            errorStyle: 'stop',
            errorTitle: 'Use a non-negative number',
            error: 'Enter zero or a positive number, or leave unresolved inputs blank.',
          };
        if (['money', 'formula'].includes(column.type)) cell.numFmt = '#,##0.00;[Red](#,##0.00)';
        if (column.type === 'date') cell.numFmt = 'yyyy-mm-dd';
      }
      if (definition.budget) {
        const n = rowIndex;
        const result = calculateBudgetRow(values[2], values[4], values[5], values[7]);
        row.getCell(7).value = {
          formula: `IF(OR(C${n}="",E${n}=""),"",ROUND(C${n}*E${n}+IF(F${n}="",0,F${n}),2))`,
          result: result.total ?? '',
        };
        row.getCell(9).value = {
          formula: `IF(OR(G${n}="",H${n}=""),"",ROUND(H${n}-G${n},2))`,
          result: result.remaining ?? '',
        };
      }
    }
    if (definition.budget) {
      sheet.mergeCells('A27:F27');
      sheet.getCell('A27').value = 'Known-line subtotal only; excludes unresolved amounts';
      const totals = (example ? displayRows(definition) : []).reduce(
        (sum, r) => ({ total: sum.total + (r[6] ?? 0), remaining: sum.remaining + (r[8] ?? 0) }),
        { total: 0, remaining: 0 },
      );
      sheet.getCell('G27').value = { formula: 'SUM(G6:G25)', result: totals.total };
      sheet.getCell('I27').value = { formula: 'SUM(I6:I25)', result: totals.remaining };
      sheet.getCell('G27').numFmt = sheet.getCell('I27').numFmt = '#,##0.00;[Red](#,##0.00)';
      sheet.getRow(27).font = { bold: true };
      sheet.getRow(27).height = 40;
    }
    sheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: dataRows + 5, column: count },
    };
    sheet.pageSetup = {
      paperSize: 1,
      margins: { left: 0.4, right: 0.4, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 },
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:5',
      printArea: `A1:${sheet.getColumn(count).letter}${example ? Math.max(6, definition.rows.length + 5) : 25}`,
    };
    if (definition.budget) sheet.pageSetup.printArea = 'A1:J27';
    sheet.headerFooter.oddFooter = '&LOpenLintel | Educational planning resource &RPage &P';
  }
  book.eachSheet((sheet) =>
    sheet.eachRow((row) =>
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'top', wrapText: true, ...cell.alignment };
        if (typeof cell.value === 'string')
          cell.alignment = { ...cell.alignment, horizontal: 'left', indent: 1 };
        cell.font = { name: 'Calibri', size: 11, ...cell.font };
      }),
    ),
  );
  return reproducible(await book.xlsx.writeBuffer());
}

async function document(definition, example) {
  const p = (text, options = {}) =>
    new Paragraph({
      text,
      spacing: { after: 100 },
      ...(options.heading ? { keepNext: true } : {}),
      ...options,
    });
  const children = [
    p(definition.title, { heading: HeadingLevel.TITLE }),
    p(example ? 'Worked example • Pending review' : 'Blank editable template', {
      heading: HeadingLevel.SUBTITLE,
    }),
    p(
      `OpenLintel • Educational planning resource • ${editorialDate(definition).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`,
    ),
    p(exampleNotice),
    p('How to use', { heading: HeadingLevel.HEADING_1 }),
    p(definition.use),
    ...definition.steps.map((text) => p(text, { bullet: { level: 0 } })),
    p('Review before use', { heading: HeadingLevel.HEADING_1 }),
    ...definition.mistakes.map((text) => p(text, { bullet: { level: 0 } })),
    p(
      'Replace illustrative information with verified project records. No approval, legal agreement, or construction readiness is represented. Keep completed client documents in your own secure system.',
    ),
    p(example ? 'Illustrative worked example' : 'Your project', {
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
    }),
    ...definition.fields.flatMap((f, index) => [
      p(f.label, { heading: HeadingLevel.HEADING_2, keepNext: true }),
      p(f.help, { keepNext: true }),
      ...(example
        ? [p(f.example)]
        : [
            p('[Enter your project information here. Leave unknowns explicit.]'),
            // A trailing spacer can spill onto a footer-only final printed page.
            ...(index < definition.fields.length - 1 ? [p(' ')] : []),
          ]),
    ]),
  ];
  const doc = new Document({
    creator: 'OpenLintel',
    title: definition.title,
    description: definition.description,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '252722' },
          paragraph: { spacing: { line: 260 } },
        },
        heading1: {
          run: { font: 'Calibri', size: 30, color: '914F38' },
          paragraph: { spacing: { before: 220, after: 140 }, keepNext: true },
        },
        heading2: {
          run: { font: 'Calibri', size: 25, bold: true, color: '252722' },
          paragraph: { spacing: { before: 140, after: 100 }, keepNext: true },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 900, bottom: 900, left: 1000, right: 1000 },
          },
        },
        children,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun('OpenLintel • Planning resource • '),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                ],
              }),
            ],
          }),
        },
      },
    ],
  });
  // Normalize the package core-properties dates as well as ZIP entry timestamps.
  const archive = await JSZip.loadAsync(await Packer.toBuffer(doc));
  const core = archive.file('docProps/core.xml');
  archive.file(
    'docProps/core.xml',
    (await core.async('string')).replace(
      /(<dcterms:(created|modified)[^>]*>)[^<]+/g,
      (_, tag, kind) =>
        tag + (kind === 'modified' ? editorialDate(definition) : fixedDate).toISOString(),
    ),
  );
  return reproducible(await archive.generateAsync({ type: 'nodebuffer' }));
}

export async function generateDownloads(definition) {
  const prefix = `assets/downloads/templates/${definition.slug}`;
  if (definition.format === 'xlsx') {
    const buffer = await workbook(definition);
    return [
      {
        path: `${prefix}.xlsx`,
        label: 'Download editable workbook',
        format: 'XLSX',
        variant: 'workbook',
        buffer,
        size: buffer.length,
      },
    ];
  }
  const downloads = await Promise.all(
    [false, true].map(async (example) => {
      const buffer = await document(definition, example);
      return {
        path: `${prefix}-${example ? 'example' : 'blank'}.docx`,
        label: example ? 'Download worked example' : 'Download blank template',
        format: 'DOCX',
        variant: example ? 'example' : 'blank',
        buffer,
        size: buffer.length,
      };
    }),
  );
  const append = (suffix, label, format, variant, buffer) =>
    downloads.push({
      path: `${prefix}-${suffix}.${format.toLowerCase()}`,
      label,
      format,
      variant,
      buffer,
      size: buffer.length,
    });
  if (definition.id === 'presentation') {
    for (const example of [false, true])
      append(
        example ? 'example' : 'blank',
        example ? 'Download editable slide example' : 'Download editable blank slides',
        'PPTX',
        example ? 'example' : 'blank',
        await createPresentation(example, definition.modified),
      );
    append(
      'preview',
      'Download slide preview',
      'PDF',
      'preview',
      await createPresentationPdf(definition.modified),
    );
  }
  if (definition.id === 'client-questionnaire')
    append(
      'blank',
      'Download printable questionnaire',
      'PDF',
      'blank',
      createQuestionnairePdf(definition),
    );
  return downloads;
}
