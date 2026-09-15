// Task-specific editorial additions to the existing library; not practitioner review.
const additions = {
  'mood-board': {
    title: 'Record feedback without turning a board into an order',
    paragraph:
      'Use the same comparison question for both directions: what should remain, what should change, and why? Keep the retained conditions visible so a client preference is not accidentally attributed to a different room layout. This table is an authored exercise, not actual client feedback.',
    rows: [
      [
        '“Quiet Oak feels calmer.”',
        'Record a material-direction preference; exact products still unresolved.',
      ],
      [
        '“We prefer the darker joinery only.”',
        'Identify J-01 as the subject of a further study; do not adopt the whole alternative.',
      ],
      [
        '“Use that sofa.”',
        'Clarify the visual preference, then develop the F-01 specification separately.',
      ],
    ],
    href: 'resources/ai-concept-images-vs-design-documentation/',
    label: 'Separate visual intent from design evidence',
    related: 'concept-vs-documents',
  },
  'material-board': {
    title: 'Keep the sample-to-surface connection intact',
    paragraph:
      'A material reference needs an application as well as a name. When the palette advances, keep the selected physical or product reference traceable in your own project record. The current sample has no verified manufacturer products or physical-sample approvals.',
    rows: [
      [
        'FIN-01 retained floor',
        'Use it as a visual reference; condition remains a survey question.',
      ],
      [
        'FIN-02 warm mineral walls',
        'Develop a surface assignment and product information; leave area unresolved.',
      ],
      [
        'J-01 pale oak joinery',
        'Link finish intent to the joinery record rather than assuming a fabrication specification.',
      ],
    ],
    href: 'resources/brief-to-coordinated-schedules/',
    label: 'Follow material decisions through the record chain',
    related: 'brief-to-schedules',
  },
  'concept-board': {
    title: 'Separate the design argument from the next information request',
    paragraph:
      'For each part of the idea, explain which requirement it serves and what it leaves undecided. This allows the concept discussion to progress without disguising uncertainty. A future product change may leave the organizing idea intact.',
    rows: [
      [
        'Reading near the window',
        'An activity relationship; actual use, light, and furniture requirements still need review.',
      ],
      [
        'Conversation seating',
        'A purpose for F-01 and F-02, not confirmed sofa or chair products.',
      ],
      ['J-01 storage', 'A proposed response to the brief, not a verified joinery design.'],
    ],
    href: 'resources/brief-to-coordinated-schedules/',
    label: 'Translate the brief into identifiable records',
    related: 'brief-to-schedules',
  },
  'space-planning': {
    title: 'Test a selection change against the plan',
    paragraph:
      'When a product changes, a familiar symbol can conceal a different physical envelope. Keep the proposed item and its verified dimensions traceable. Do not preserve a pleasing layout by quietly scaling a generic furniture symbol to fit.',
    rows: [
      [
        'F-01 replacement proposed',
        'Obtain candidate dimensions and review the seating relationship.',
      ],
      [
        'F-02 position reviewed',
        'Check the actual use and movement relationship, not a universal clearance from this guide.',
      ],
      [
        'J-01 dimensions developed',
        'Reconcile room sources, the plan, and elevation; sample dimensions remain nominal.',
      ],
    ],
    href: 'resources/interior-design-specification-change/',
    label: 'Review every record affected by a selection change',
    related: 'specification-change',
  },
  'measure-room': {
    title: 'Preserve units and provenance during transcription',
    paragraph:
      'For US work, agree whether a value is feet and inches, decimal feet, inches, or a metric unit before entering it. Keep the primary measured record intact and label display conversions with their rounding. A conversion is not a new observation and should not create false precision.',
    rows: [
      [
        'Nominal fixture: 5000 mm',
        'Keep “nominal, not surveyed” with the number when copied to the room sheet.',
      ],
      [
        'Provided plan conflicts with a reading',
        'Record both sources and investigate reference points; do not silently average them.',
      ],
      [
        'Opening could not be measured',
        'Record the access limitation and a follow-up action instead of estimating from a photo.',
      ],
    ],
    href: 'templates/room-data-sheet/',
    label: 'Transfer information with its source and status',
    related: 'concept-vs-documents',
  },
  'design-process': {
    title: 'Define the output at each transition',
    paragraph:
      'Project phases are easier to interpret when the exit record is explicit. Treat the table as a teaching workflow, not a promise that every residential project uses the same scope, duration, or review sequence.',
    rows: [
      [
        'Discovery → concept',
        'Agreed priorities and visible information requests, not an assumed complete survey.',
      ],
      [
        'Concept → development',
        'Identified direction and separate product questions, not blanket technical approval.',
      ],
      [
        'Development → handoff',
        'Current indexed records and open actions, not a folder labeled “final”.',
      ],
    ],
    href: 'resources/interior-design-handoff-package/',
    label: 'Identify what the next person actually receives',
    related: 'handoff-package',
  },
  procurement: {
    title: 'Do not let a selection state become an order state',
    paragraph:
      'Keep your design register connected to the actual purchasing record, but do not let one replace the other. A proposed selection can stay useful while price, availability, authority, or suitability questions remain unresolved.',
    rows: [
      [
        'A sofa appears on a board',
        'Visual proposal only; no verified model or purchasing authority follows.',
      ],
      [
        'A quote is received',
        'Retain its source and scope; receipt alone is not authorization to order.',
      ],
      [
        'An item is delivered',
        'Record receipt separately from any required inspection or acceptance process.',
      ],
    ],
    href: 'resources/interior-design-approval-states/',
    label: 'Distinguish review from purchasing authority',
    related: 'approval-states',
  },
  'elevation-guide': {
    title: 'Make a dimensional question traceable',
    paragraph:
      'A drawing comment should identify the reference and the unresolved information rather than propose a confident-looking fix without evidence. The sample elevation is a discussion aid, not a template for construction details.',
    rows: [
      [
        'J-01 overall width',
        'Compare the stated nominal width with the future verified room source; do not scale the image.',
      ],
      [
        'Three nominal modules',
        'Confirm how developed components and interfaces are represented before fabrication use.',
      ],
      [
        'Missing junction information',
        'Identify the affected location and required professional input; do not infer a fixing.',
      ],
    ],
    href: 'resources/interior-design-handoff-package/',
    label: 'Keep unresolved drawing information in the issue record',
    related: 'handoff-package',
  },
  'rcp-guide': {
    title: 'Keep the teaching diagram outside the original issue set',
    paragraph:
      'The library’s ceiling diagram was authored to explain reading and coordination questions. It is not an additional numbered Window Room drawing. If adapting the diagram for discussion, retain that label and do not imply that a services design or survey has occurred.',
    rows: [
      [
        'Notional lighting symbol',
        'Discuss the legend; no fixture, output, spacing, or wiring is specified.',
      ],
      [
        'Dashed coordination zone',
        'Identify an interface to investigate; no concealed condition is established.',
      ],
      [
        'Nominal ceiling height',
        'Ask for verified height information and variations rather than carrying the fixture value into installation work.',
      ],
    ],
    href: 'resources/interior-design-handoff-package/',
    label: 'Separate teaching references from actual issue contents',
    related: 'handoff-package',
  },
  'ffe-guide': {
    title: 'Resolve the record boundary before adding products',
    paragraph:
      'Write down how your team uses the schedule, specification, and purchasing record. This is more useful than assuming the acronym carries an identical scope for the designer, client, accountant, and installer.',
    rows: [
      ['Where and how many?', 'Use the room/item register with explicit units.'],
      ['Which product and attributes?', 'Use the specification and current source information.'],
      [
        'Who can order, and has it happened?',
        'Use a distinct purchasing decision and actual order record.',
      ],
    ],
    href: 'resources/brief-to-coordinated-schedules/',
    label: 'Trace each fact to the record that owns it',
    related: 'brief-to-schedules',
  },
  'project-management': {
    title: 'Make an open decision actionable',
    paragraph:
      'A decision backlog should describe what blocks progress, not just who has an overdue task. For F-01, distinguish obtaining product information, reviewing the option, and deciding whether purchasing may proceed.',
    rows: [
      ['Question', 'Which sofa candidate should be developed for F-01?'],
      [
        'Required input',
        'Candidate identity, dimensions, source, cost information, and relevant reviews.',
      ],
      [
        'Current sample outcome',
        'Unresolved; no actual owner, deadline, or purchasing authority is represented.',
      ],
    ],
    href: 'resources/interior-design-approval-states/',
    label: 'Record the actual decision and its boundary',
    related: 'approval-states',
  },
  'drawing-checklist': {
    title: 'Record the result, not just a check mark',
    paragraph:
      'A completed checklist should say which issue was inspected, what was found, and what was not covered. Do not label a technical package reviewed merely because an editorial consistency pass has been completed.',
    rows: [
      ['Reference check', 'WR-01 J-01 points to WR-02; check the current issue of both.'],
      ['Source check', 'Nominal fixture dimensions are not a measured room record.'],
      [
        'Open issue',
        'J-01 fabrication details remain unresolved; qualified development is required.',
      ],
    ],
    href: 'resources/interior-design-handoff-package/',
    label: 'Carry review findings into the handoff index',
    related: 'handoff-package',
  },
};

export function enrichExistingGuide(item) {
  const addition = additions[item.id];
  if (!addition) throw new Error(`Missing editorial addition for ${item.id}`);
  return {
    ...item,
    sections: [
      ...item.sections,
      {
        id: 'record-example',
        title: addition.title,
        paragraphs: [addition.paragraph],
        items: [],
        table: {
          caption: 'Illustrative teaching exercise · No actual project review or approval',
          headers: ['Situation or reference', 'Useful record or next action'],
          rows: addition.rows,
        },
        links: [{ href: addition.href, label: addition.label }],
      },
    ],
    related: [...new Set([...item.related, addition.related])],
    pilot:
      'Does this step lose information when your team moves to the next document? Discuss the coordination problem in a pilot discovery conversation. OpenLintel is in active development; this is not a hosted trial.',
  };
}
