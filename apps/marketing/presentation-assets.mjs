import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { createHash } from 'node:crypto';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

// One authored scene describes the web preview, editable slide objects and PDF.
// Images are the project's existing owned illustrations; no slide is flattened.
export const presentationSize = { width: 960, height: 540 };
const palette = {
  paper: 'F5F1E9',
  ink: '252722',
  muted: '69695F',
  clay: '914F38',
  rule: 'D8D1C5',
  card: 'ECE7DD',
};
const xml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const box = (x, y, w, h, fill = palette.card, stroke) => ({
  type: 'box',
  x,
  y,
  w,
  h,
  fill,
  stroke,
});
const text = (x, y, w, h, value, size = 17, options = {}) => ({
  type: 'text',
  x,
  y,
  w,
  h,
  value,
  size,
  color: palette.ink,
  ...options,
});
const picture = (x, y, w, h, asset, alt) => ({ type: 'image', x, y, w, h, asset, alt });
const lines = (value, width, size) => {
  const pdf = new jsPDF({ unit: 'pt', format: [960, 540], orientation: 'landscape' });
  pdf.setFont('helvetica');
  pdf.setFontSize(size);
  return value.split('\n').flatMap((line) => (line ? pdf.splitTextToSize(line, width) : ['']));
};
let assetPromise;
async function assets() {
  assetPromise ||= Promise.all(
    ['room', 'alternative', 'materials'].map(async (key) => ({
      key,
      png: await readFile(new URL(`./assets/images/${key}-original.png`, import.meta.url)),
      webp: await readFile(new URL(`./assets/images/${key}-960.webp`, import.meta.url)),
    })),
  ).then((items) => Object.fromEntries(items.map(({ key, ...value }) => [key, value])));
  return assetPromise;
}
function frame(title, eyebrow, page, example) {
  return [
    box(0, 0, 960, 540, palette.paper),
    text(36, 23, 888, 18, `OPENLINTEL / ${eyebrow.toUpperCase()}`, 11, { color: palette.clay }),
    text(36, 54, 888, 46, title, 29),
    box(36, 498, 888, 1, palette.rule),
    text(
      36,
      510,
      818,
      18,
      example
        ? 'Illustrative teaching example. Pending review. No purchasing or construction approval.'
        : 'Editable planning template. Replace placeholders; keep sources, units and unresolved items visible.',
      10,
      { color: palette.muted },
    ),
    text(880, 510, 44, 18, String(page).padStart(2, '0'), 10, { color: palette.muted }),
  ];
}
function card(scene, x, y, w, title, body, h = 140) {
  scene.push(
    box(x, y, w, h),
    text(x + 18, y + 16, w - 36, 24, title, 18),
    text(x + 18, y + 53, w - 36, h - 62, body, 15),
  );
}
function imageSlot(scene, x, y, w, h, example, asset, label) {
  if (example) scene.push(picture(x, y, w, h, asset, label));
  else
    scene.push(
      box(x, y, w, h, 'E4DFD4', palette.muted),
      text(
        x + 22,
        y + 25,
        w - 44,
        h - 50,
        `[Insert your licensed ${label.toLowerCase()}]\n\nReplace this shape with an image. Keep the source and review status alongside it.`,
        18,
      ),
    );
}
export function moodBoardScene(direction, example = true) {
  const quiet = direction === 'quiet-oak';
  const scene = frame(
    example
      ? quiet
        ? 'Quiet Oak'
        : 'Deep Olive'
      : quiet
        ? '[Direction A / mood board]'
        : '[Direction B / comparison]',
    'Material direction',
    quiet ? 3 : 4,
    example,
  );
  imageSlot(scene, 36, 116, 440, 294, example, quiet ? 'room' : 'alternative', 'Concept image');
  scene.push(
    text(
      36,
      424,
      440,
      58,
      example
        ? quiet
          ? 'Selected illustrative direction. Retain the oak floor; explore pale oak, mineral walls and linen.'
          : 'Alternative study only. Darker joinery and olive upholstery; keep the same room and brief.'
        : '[Explain how this direction answers the brief. State what is retained and what changes.]',
      15,
    ),
  );
  const colors = quiet
    ? ['C9B18B', 'DFC9A8', 'E3DFD2', 'B9B1A0']
    : ['C9B18B', '514637', '777C5A', 'D9D3C4'];
  const labels = quiet
    ? ['Retained oak', 'Pale joinery', 'Mineral wall', 'Linen study']
    : ['Retained oak', 'Dark joinery', 'Olive textile', 'Warm neutral'];
  colors.forEach((color, i) =>
    scene.push(
      box(510 + i * 105, 116, 92, 58, example ? color : 'D8D1C5'),
      text(510 + i * 105, 186, 98, 40, example ? labels[i] : `[Swatch ${i + 1}]`, 12),
    ),
  );
  scene.push(text(510, 237, 404, 26, 'The design argument', 19));
  scene.push(
    text(
      510,
      278,
      404,
      88,
      example
        ? quiet
          ? 'A lighter material relationship supports reading and conversation while keeping the existing floor as the anchor.'
          : 'A deeper contrast tests the atmosphere without silently changing the retained floor, openings or activities.'
        : '[Explain color, texture and contrast. Use source-backed product information separately.]',
      18,
    ),
  );
  scene.push(
    box(510, 385, 414, 97),
    text(
      526,
      399,
      382,
      70,
      example
        ? 'Palette swatches are illustrative, not physical samples. AI-generated room imagery. Product, cost and technical suitability remain unresolved.'
        : '[Record image rights, swatch sources and unresolved selections. A direction is not an order.]',
      14,
    ),
  );
  return scene;
}
export function presentationScenes(example) {
  const pages = [];
  let scene = frame(example ? 'The Window Room' : '[Project name]', 'Design review', 1, example);
  imageSlot(scene, 470, 115, 454, 302, example, 'room', 'Room concept image');
  scene.push(
    text(36, 127, 392, 44, 'One review. A clear decision.', 25),
    text(
      36,
      194,
      382,
      137,
      example
        ? 'Discuss the material direction for a room to read, gather and store everyday belongings.\n\nQuiet Oak continues into the illustrative drawings.'
        : "[Describe today's review purpose and the decision you need from the client.]",
      19,
    ),
    text(
      36,
      380,
      390,
      95,
      example
        ? 'Example scope: concept discussion only.\nSurvey, supplier selection and technical review remain outstanding.'
        : '[Date / revision / prepared by]\n[Review scope and information still needed]',
      16,
    ),
    text(
      470,
      435,
      454,
      40,
      example
        ? 'AI-generated illustration. Not verified application output or completed client work.'
        : '[Image credit / status / source]',
      13,
      { color: palette.muted },
    ),
  );
  pages.push(scene);
  scene = frame('Keep the brief in view', 'Inputs & boundaries', 2, example);
  card(
    scene,
    36,
    118,
    430,
    'Priorities',
    example
      ? 'Reading, conversation and storage. Confirm the household routines behind each activity.'
      : '[List the agreed needs and the questions that remain.]',
  );
  card(
    scene,
    494,
    118,
    430,
    'Retained conditions',
    example
      ? 'Existing oak floor, window and entrance positions. Condition and dimensions need verification.'
      : '[List what must stay and the source of each constraint.]',
  );
  card(
    scene,
    36,
    286,
    430,
    'Source information',
    example
      ? 'Nominal room: 5000 x 4000 mm. This is teaching data, not a measured survey.'
      : '[Record survey/drawing references, units, date and status.]',
    174,
  );
  card(
    scene,
    494,
    286,
    430,
    'Outside this review',
    example
      ? 'No product approval, purchase authorization or construction instruction. Budget and dates are unresolved.'
      : '[Name the decisions this review does not establish.]',
    174,
  );
  pages.push(scene, moodBoardScene('quiet-oak', example), moodBoardScene('deep-olive', example));
  scene = frame('Connect the layout to the records', 'Editable reference diagram', 5, example);
  scene.push(
    box(52, 122, 408, 316, 'F5F1E9', palette.ink),
    box(88, 304, 175, 69, 'D8C7B0', palette.ink),
    box(331, 191, 65, 65, 'C0B7A8', palette.ink),
    box(61, 146, 27, 128, 'BBA27E', palette.ink),
  );
  scene.push(
    text(103, 324, 142, 32, example ? 'F-01 / sofa' : '[Item ID]', 17),
    text(332, 210, 64, 28, example ? 'F-02' : '[ID]', 14),
    text(112, 152, 257, 37, example ? 'J-01 / storage on west wall' : '[Storage / reference]', 16),
  );
  scene.push(
    text(52, 451, 416, 29, 'Diagram only. Do not scale or use for installation.', 13, {
      color: palette.muted,
    }),
  );
  card(
    scene,
    504,
    123,
    420,
    'Cross-check before advancing',
    example
      ? 'F-01: final product and dimensions unresolved.\nF-02: seating location to review.\nJ-01: coordinate plan and elevation.\nWR-01 / WR-02: illustrative, revision R0.'
      : '[List item IDs, unresolved dimensions and the drawing revisions that must stay coordinated.]',
    245,
  );
  scene.push(
    text(
      520,
      395,
      387,
      75,
      example
        ? 'All shapes and labels on this slide are editable. Replace this teaching diagram with reviewed project information.'
        : '[Replace diagram shapes or insert a verified plan. Keep the source, units and revision explicit.]',
      15,
    ),
  );
  pages.push(scene);
  scene = frame('Make the open questions visible', 'Selection & coordination', 6, example);
  const tableRows = example
    ? [
        ['F-01 / proposed sofa', 'Final model, dimensions and fabric', 'Pending review'],
        ['J-01 / pale oak joinery', 'Fabrication details and site interfaces', 'Pending review'],
        ['FIN-01 / retained floor', 'Existing condition and protection', 'Survey needed'],
        ['FIN-02 / wall finish', 'Area, substrate and actual product', 'Not specified'],
      ]
    : Array.from({ length: 4 }, () => [
        '[Reference / selection]',
        '[Information still needed]',
        '[Status / owner]',
      ]);
  ['Reference / selection', 'Next information request', 'Status'].forEach((label, i) =>
    scene.push(text([49, 326, 730][i], 125, [258, 386, 180][i], 30, label, 16, { bold: true })),
  );
  tableRows.forEach((row, index) => {
    const y = 173 + index * 69;
    scene.push(box(36, y - 9, 888, 61, index % 2 ? 'EEE9DF' : 'E5DFD4'));
    row.forEach((value, i) =>
      scene.push(text([49, 326, 730][i], y, [258, 386, 180][i], 45, value, 15)),
    );
  });
  scene.push(
    text(
      36,
      457,
      888,
      29,
      'Keep the same references in the spec sheet, FF&E schedule and finish schedule.',
      14,
    ),
  );
  pages.push(scene);
  scene = frame('Record the decision separately', 'Feedback & approval scope', 7, example);
  card(
    scene,
    36,
    118,
    430,
    'Decision requested',
    example
      ? 'Which material direction should be developed? Confirm the reasons, including any elements requiring another study.'
      : '[Write the specific decision requested today.]',
    152,
  );
  card(
    scene,
    494,
    118,
    430,
    'Response and owner',
    example
      ? 'No actual client response is represented. Record the appointed decision-maker and feedback in your own project record.'
      : '[Record the response, decision-maker, date and source.]',
    152,
  );
  card(
    scene,
    36,
    296,
    430,
    'Affected records',
    example
      ? 'Brief, concept record, F-01/J-01 specifications and relevant drawings. Preserve the prior revision.'
      : '[Identify every drawing, schedule or brief affected.]',
    168,
  );
  card(
    scene,
    494,
    296,
    430,
    'Next action',
    example
      ? 'Resolve source information and professional reviews before developing products or ordering. The sample does not authorize either.'
      : '[Assign follow-up work and the next review. Leave unappointed roles explicit.]',
    168,
  );
  pages.push(scene);
  scene = frame('Make this deck your own', 'Working with the template', 8, example);
  card(
    scene,
    36,
    118,
    430,
    'Edit the native objects',
    'Text, palette swatches, diagram shapes and placeholders are separate objects. Replace picture objects with your own licensed visuals.',
    159,
  );
  card(
    scene,
    494,
    118,
    430,
    'Retain the audit trail',
    'Keep sources, item references, units, revision and unresolved information together. Store client information in your own project system.',
    159,
  );
  card(
    scene,
    36,
    304,
    888,
    'Continue the workflow',
    'Use the DOCX storyboard to plan the narrative; the XLSX spec, FF&E and finish templates to record selections; and the handoff guide to prepare the next issue.\nopenlintel.com/templates/ | openlintel.com/resources/interior-design-handoff-package/',
    163,
  );
  pages.push(scene);
  return pages;
}

export async function sceneSvg(scene, title) {
  const images = await assets();
  const body = scene
    .map((node) => {
      if (node.type === 'box')
        return `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" fill="#${node.fill}"${node.stroke ? ` stroke="#${node.stroke}"` : ''}/>`;
      if (node.type === 'image')
        return `<image x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" preserveAspectRatio="xMidYMid slice" href="data:image/webp;base64,${images[node.asset].webp.toString('base64')}"><title>${xml(node.alt)} - AI-generated illustrative imagery</title></image>`;
      return `<text x="${node.x}" y="${node.y + node.size}" font-family="Arial, sans-serif" font-size="${node.size}" fill="#${node.color}"${node.bold ? ' font-weight="bold"' : ''}>${lines(
        node.value,
        node.w,
        node.size,
      )
        .map(
          (line, index) =>
            `<tspan x="${node.x}" dy="${index ? node.size * 1.22 : 0}">${xml(line)}</tspan>`,
        )
        .join('')}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-labelledby="title desc"><title id="title">${xml(title)}</title><desc id="desc">Original composed mood board with illustrative room imagery, editable palette swatches in the accompanying PPTX, rationale and review boundaries. Not actual product samples.</desc>${body}</svg>\n`;
}

export async function createPresentation(example, modified = '2026-09-26') {
  const deck = new PptxGenJS();
  deck.layout = 'LAYOUT_WIDE';
  deck.author = 'OpenLintel';
  deck.subject = 'Editable residential design review; illustrative, pending professional review';
  deck.title = example
    ? 'The Window Room - illustrative presentation'
    : 'Interior design presentation - blank template';
  deck.company = 'OpenLintel';
  deck.lang = 'en-US';
  deck.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial', lang: 'en-US' };
  const images = await assets();
  for (const scene of presentationScenes(example)) {
    const slide = deck.addSlide();
    for (const node of scene) {
      const position = { x: node.x / 72, y: node.y / 72, w: node.w / 72, h: node.h / 72 };
      if (node.type === 'box')
        slide.addShape(deck.ShapeType.rect, {
          ...position,
          fill: { color: node.fill },
          line: { color: node.stroke || node.fill, width: node.stroke ? 1 : 0 },
        });
      else if (node.type === 'image')
        slide.addImage({
          data: `image/png;base64,${images[node.asset].png.toString('base64')}`,
          ...position,
          sizing: { type: 'cover', w: position.w, h: position.h },
          altText: `${node.alt}; AI-generated illustrative image`,
        });
      else
        slide.addText(node.value, {
          ...position,
          fontFace: 'Arial',
          fontSize: node.size,
          color: node.color,
          bold: node.bold || false,
          margin: 0,
          breakLine: false,
          valign: 'top',
          lineSpacingMultiple: 1.08,
          paraSpaceAfterPt: 0,
          fit: 'shrink',
          objectName: node.value.slice(0, 70),
        });
    }
    slide.addNotes(
      'Authored educational example; no real client approval or verified application output. The shapes and text remain editable. Replace imagery with licensed project material.',
    );
  }
  const archive = await JSZip.loadAsync(
    await deck.write({ outputType: 'nodebuffer', compression: true }),
  );
  const date = new Date(`${modified}T00:00:00Z`);
  const core = await archive.file('docProps/core.xml').async('string');
  archive.file(
    'docProps/core.xml',
    core.replace(/(<dcterms:(?:created|modified)[^>]*>)[^<]+/g, `$1${date.toISOString()}`),
  );
  for (const entry of Object.values(archive.files)) entry.date = new Date('2026-09-14T00:00:00Z');
  return archive.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

function pdfDocument(title, modified, format, orientation = 'portrait') {
  const pdf = new jsPDF({
    unit: 'pt',
    format,
    orientation,
    compress: true,
    putOnlyUsedFonts: true,
  });
  pdf.setProperties({
    title,
    author: 'OpenLintel',
    creator: 'OpenLintel marketing',
    subject: 'Educational planning resource; pending professional review',
  });
  pdf.setCreationDate(`D:${modified.replaceAll('-', '')}000000+00'00'`);
  pdf.setFileId(
    createHash('sha256').update(`${title}:${modified}`).digest('hex').slice(0, 32).toUpperCase(),
  );
  return pdf;
}
export async function createPresentationPdf(modified = '2026-09-26') {
  const pdf = pdfDocument(
    'Interior design presentation - illustrative preview',
    modified,
    [960, 540],
    'landscape',
  );
  const images = await assets();
  for (const [index, scene] of presentationScenes(true).entries()) {
    if (index) pdf.addPage([960, 540], 'landscape');
    for (const node of scene) {
      if (node.type === 'box') {
        pdf.setFillColor(`#${node.fill}`);
        if (node.stroke) pdf.setDrawColor(`#${node.stroke}`);
        pdf.rect(node.x, node.y, node.w, node.h, node.stroke ? 'FD' : 'F');
      } else if (node.type === 'image') {
        // The existing illustrations are 3:2; frame dimensions retain that ratio.
        pdf.addImage(
          images[node.asset].png,
          'PNG',
          node.x,
          node.y,
          node.w,
          node.h,
          node.asset,
          'FAST',
        );
      } else {
        pdf.setFont('helvetica', node.bold ? 'bold' : 'normal');
        pdf.setFontSize(node.size);
        pdf.setTextColor(`#${node.color}`);
        pdf.text(lines(node.value, node.w, node.size), node.x, node.y + node.size, {
          lineHeightFactor: 1.22,
        });
      }
    }
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
export function createQuestionnairePdf(definition) {
  const pdf = pdfDocument(
    'Interior design client questionnaire - printable blank',
    definition.modified || '2026-09-26',
    'letter',
  );
  const fieldsPerPage = 4;
  const total = Math.ceil(definition.fields.length / fieldsPerPage);
  for (let page = 0; page < total; page++) {
    if (page) pdf.addPage('letter', 'portrait');
    pdf.setTextColor('#252722');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('OPENLINTEL / PRINTABLE CLIENT QUESTIONNAIRE', 42, 39);
    pdf.setFontSize(23);
    pdf.text(page ? 'Continue the conversation' : 'Begin with everyday life', 42, 78);
    pdf.setFontSize(11);
    pdf.text(
      [
        'Blank planning aid. Keep completed client information in your own secure system.',
        'Short answers are useful. Leave unknowns explicit and discuss them together.',
      ],
      42,
      105,
    );
    const fields = definition.fields.slice(page * fieldsPerPage, (page + 1) * fieldsPerPage);
    fields.forEach((field, index) => {
      const y = 162 + index * 139;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text(`${page * fieldsPerPage + index + 1}. ${field.label}`, 42, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(pdf.splitTextToSize(field.help, 526), 42, y + 21, { lineHeightFactor: 1.22 });
      pdf.setDrawColor('#D8D1C5');
      for (const offset of [69, 92, 115]) pdf.line(42, y + offset, 570, y + offset);
    });
    pdf.setFontSize(9);
    pdf.setTextColor('#69695F');
    pdf.text(
      `Educational planning resource. No legal or technical approval. | ${page + 1} / ${total}`,
      42,
      755,
    );
    pdf.text(
      'Editable DOCX and examples: openlintel.com/templates/interior-design-client-questionnaire/',
      42,
      770,
    );
  }
  return Buffer.from(pdf.output('arraybuffer'));
}
