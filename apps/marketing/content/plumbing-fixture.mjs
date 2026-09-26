// Original private residential example, independent of The Window Room.
export function plumbingFixtureDraft() {
  const fields = [
    [
      'reference',
      'Fixture reference',
      'Assign a stable fixture identifier shared by the schedule, specification and relevant drawing.',
    ],
    ['room', 'Room reference', 'Use the project room identifier consistently.'],
    [
      'type',
      'Fixture / design role',
      'Identify the required function separately from an unselected product.',
    ],
    ['quantity', 'Quantity', 'Record the intended count; verify against the current layout.'],
    ['unit', 'Unit', 'State the counting or purchasing unit and check set or pack contents.'],
    ['manufacturer', 'Manufacturer', 'Record only a verified manufacturer.'],
    [
      'model',
      'Model / catalog number',
      'Use the exact model from a checked manufacturer or supplier source.',
    ],
    [
      'finish',
      'Finish / selection state',
      'Distinguish a design preference from a verified product finish or final selection.',
    ],
    [
      'productSource',
      'Product source',
      'Link the actual product page, supplier record or data sheet and its revision.',
    ],
    ['checkedDate', 'Source checked date', 'Record the date the actual source was checked.'],
    [
      'specification',
      'Specification reference',
      'Link the project specification record and cut sheet when available.',
    ],
    [
      'drawing',
      'Drawing / location reference',
      'Link the relevant layout or elevation only if it exists.',
    ],
    [
      'interface',
      'Related fixture / interface',
      'Identify related items whose compatibility still needs checking.',
    ],
    [
      'supply',
      'Supply responsibility',
      'Name who supplies the item only after responsibility is agreed.',
    ],
    [
      'reviewOwner',
      'Installation review owner',
      'Record the appointed professional responsible for the relevant installation review.',
    ],
    [
      'reviewState',
      'Review status',
      'Keep proposed selection, technical review and purchasing approval distinct.',
    ],
    [
      'openChecks',
      'Open coordination checks',
      'List missing dimensions, mounting, compatibility or service information without inventing specifications.',
    ],
    [
      'revision',
      'Revision / next action',
      'Preserve the current revision and state the next information request.',
    ],
  ];
  const examples = [
    {
      reference: 'PF-01',
      room: 'B-01 - illustrative powder room',
      type: 'Handwash basin concept',
      quantity: 1,
      unit: 'item; verify final set',
      manufacturer: 'Not selected',
      model: 'Not selected',
      finish: 'Light ceramic preference only; product unresolved',
      productSource: 'No product source or supplier quote',
      checkedDate: '',
      specification: 'SP-PF-01 - teaching placeholder; no cut sheet',
      drawing: 'No measured layout or issued drawing',
      interface: 'PF-02 faucet; basin and faucet compatibility unresolved',
      supply: 'Not assigned',
      reviewOwner: 'Not appointed',
      reviewState: 'Proposed function only; no technical or purchasing approval',
      openChecks:
        'Confirm basin envelope, mounting, faucet-hole arrangement and waste connection with sourced product information and the appointed reviewer.',
      revision: 'R0; select candidate products and obtain data sheets.',
    },
    {
      reference: 'PF-02',
      room: 'B-01 - illustrative powder room',
      type: 'Basin faucet concept',
      quantity: 1,
      unit: 'item; verify supplied components',
      manufacturer: 'Not selected',
      model: 'Not selected',
      finish: 'Brushed-metal preference only; finish code unresolved',
      productSource: 'No product source or supplier quote',
      checkedDate: '',
      specification: 'SP-PF-02 - teaching placeholder; no cut sheet',
      drawing: 'No measured layout or issued drawing',
      interface: 'PF-01 basin; reach, clearance and mounting unresolved',
      supply: 'Not assigned',
      reviewOwner: 'Not appointed',
      reviewState: 'Proposed function only; no technical or purchasing approval',
      openChecks:
        'Obtain manufacturer dimensions, installation and service requirements; assign review of basin compatibility and project suitability.',
      revision: 'R0; compare sourced candidates before any selection approval.',
    },
  ];
  return {
    id: 'plumbing-fixture-schedule',
    slug: 'plumbing-fixture-schedule',
    path: 'templates/plumbing-fixture-schedule/',
    title: 'Residential plumbing fixture schedule template',
    description:
      'Private draft workbook and PDF preview for residential fixture selections, product sources, coordination questions and review responsibility.',
    kind: 'template',
    cluster: 'coordinate',
    format: 'xlsx',
    status: 'draft',
    indexable: false,
    modified: '2026-09-26',
    wave: 4,
    recordLayout: true,
    publicationGates: [
      'First six templates reviewed by practitioners',
      'Discovery intake delivery and attribution verified',
      'Residential fixture fields and example reviewed by an appropriate practitioner',
    ],
    intro:
      'Connect each residential fixture to its room, product evidence, related items and unresolved coordination checks.',
    use: 'Private draft selection and coordination record. It does not calculate fixture demand, size services, establish code compliance or provide installation instructions. Keep product-source facts and project review separate. Use the blank record with the appointed project professionals before purchasing or installation.',
    workbookDescription:
      'One workbook with Instructions, Blank Template and Worked Example sheets. Field/value blocks keep the fixture record readable. Duplicate Blank Template for additional fixtures; retain shared references. The PDF previews both original illustrative records.',
    exampleNotice:
      'Original illustrative Powder Room Study, B-01. Independent of The Window Room; not a measured room, completed project or product specification. No manufacturer, model, supplier, approval or quote exists. Pending practitioner review.',
    exampleProvenance:
      'Authored by OpenLintel with AI assistance on 2026-09-26. B-01, PF-01, PF-02 and SP-PF references are invented teaching identifiers. The basin/faucet relationship illustrates missing coordination information; no real product data is represented.',
    unitsNote:
      'Example counts are illustrative items, not confirmed purchasing quantities. No dimensions, flow rates, service sizes, prices or regulatory requirements are supplied. Preserve actual units and source dates when entering project information.',
    columns: fields.map(([key, label, help]) => ({
      key,
      label,
      help,
      type: key === 'quantity' ? 'number' : 'text',
    })),
    rows: examples.map((values) => fields.map(([key]) => values[key])),
    recordSections: [
      {
        title: 'Fixture identity and product evidence',
        keys: fields.slice(0, 9).map(([key]) => key),
      },
      { title: 'References, responsibility and review', keys: fields.slice(9).map(([key]) => key) },
    ],
    steps: [
      'Assign stable room and fixture references.',
      'Record the intended function and count before identifying product evidence.',
      'Add exact manufacturer/model references only after checking an actual source.',
      'Connect related fixtures and record unanswered compatibility questions.',
      'Assign the appropriate review and supply responsibilities; update actual status and revision.',
    ],
    mistakes: [
      'A finish preference is not a verified product finish.',
      'A placeholder specification reference is not an available cut sheet.',
      'A coordinated-looking schedule does not prove technical suitability.',
      'Design preference, installation review and purchasing approval are separate decisions.',
    ],
    related: ['spec-sheet', 'ffe-schedule', 'room-data', 'approval-states'],
    sources: [
      {
        title: 'Housecall Pro: fixture-record fields (format reference)',
        url: 'https://www.housecallpro.com/plumbing/templates-calculators/plumbing-fixtures-schedule-template/',
      },
      {
        title: 'Chief Architect: creating a fixture schedule (schedule-category reference)',
        url: 'https://www.chiefarchitect.com/support/article/KB-00929/creating-a-plumbing-hvac-or-appliance-schedule.html',
      },
    ],
    exampleBridge: {
      title: 'Connect the review decisions',
      description:
        'This independent Powder Room Study demonstrates unresolved fixture coordination. Use the approval-state guide to distinguish design preference, technical review and purchasing authority.',
      path: 'resources/interior-design-approval-states/',
      label: 'Review the approval states',
    },
    sample: 'materials',
  };
}
