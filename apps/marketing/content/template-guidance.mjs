// Original editorial teaching examples. They add no verified site or product facts.
const example = (title, paragraphs, headers, rows, links = []) => ({
  id: 'coordination-example',
  title,
  paragraphs,
  items: [],
  table: {
    caption: 'Illustrative teaching extension · No actual project decision or approval',
    headers,
    rows,
  },
  links,
});
const link = (href, label) => ({ href, label });

const guidance = {
  'client-questionnaire': {
    section: example(
      'Turn an answer into a useful follow-up',
      [
        'Keep the original answer beside your interpretation until the client confirms it. The questionnaire gathers perspectives; the brief records agreed intent. If two household members want different things, make the tradeoff a conversation rather than selecting the answer that best fits an early design.',
        'The following wording is an authored discussion exercise, not a transcript from a real client. It shows how to ask a narrower question without converting a preference into a product instruction.',
      ],
      ['Questionnaire answer', 'Clarifying question', 'Brief entry after discussion'],
      [
        [
          '“We want somewhere to read.”',
          'When, for how long, and with what belongings nearby?',
          'Reading is a priority; lighting and storage needs to confirm.',
        ],
        [
          '“Keep the oak floor.”',
          'Must it remain untouched, or may its condition be assessed?',
          'Retain FIN-01; survey condition before proposing interventions.',
        ],
        [
          '“We like the linen sofa image.”',
          'Is the preference about color, texture, shape, or a specific product?',
          'Linen is a proposed visual direction; F-01 model and fabric unresolved.',
        ],
      ],
      [link('templates/interior-design-brief/', 'Transfer agreed needs to the brief')],
    ),
    step: 'Keep original answers and the agreed interpretation distinguishable; confirm who consolidates feedback.',
    pilot:
      'Does discovery information get lost between the first meeting and the design brief? Discuss that handoff in a pilot discovery conversation.',
  },
  'design-brief': {
    section: example(
      'Make the brief testable without specifying too early',
      [
        'A brief should help you compare options against the same requirements. Separate a need, a retained condition, and a proposed response. If the response changes, the underlying need may remain valid.',
        'A later request for another room is not a minor wording edit. Record it as a possible scope change and review its effects before inserting it into the agreed baseline.',
      ],
      ['Entry type', 'Window Room example', 'What to review next'],
      [
        [
          'Need',
          'Reading, conversation, and storage in one room.',
          'Whether the proposed relationships serve the household.',
        ],
        [
          'Constraint',
          'Retain floor and opening positions.',
          'Survey the dimensions and condition; do not infer them from the concept image.',
        ],
        [
          'Response',
          'Develop Quiet Oak with F-01 seating and J-01 storage.',
          'Concept decision only; product and technical details remain open.',
        ],
        [
          'Unresolved',
          'Budget, dates, final F-01 model.',
          'Name the information needed and a responsible person when appointed.',
        ],
      ],
      [link('resources/brief-to-coordinated-schedules/', 'Follow brief decisions into schedules')],
    ),
    step: 'Preserve the agreed brief revision when discussing new needs; review effects on scope separately.',
    pilot:
      'If the agreed brief stops being visible once drawings begin, bring that coordination problem to a pilot discovery conversation.',
  },
  proposal: {
    section: example(
      'Describe deliverables a client can recognize',
      [
        'Replace broad promises with an output, a purpose, and a review boundary. The proposal explains the service offer; the scope develops the boundary and responsibilities. The budget estimates project spending. None is interchangeable with a separately reviewed agreement.',
        'Use the table as a wording exercise, not as a recommended service package or contractual clause. Offer only work you can actually provide and leave unpriced services visibly unpriced.',
      ],
      ['Vague offer', 'More useful proposal wording', 'Still to agree'],
      [
        [
          '“Complete room design”',
          'Brief, concept comparison, and selected-direction review for the named room.',
          'Inputs, review responsibility, and revision allowance.',
        ],
        [
          '“All drawings”',
          'Named plan and elevation with stated intended use and level of development.',
          'Which specialist documents and project reviews are excluded.',
        ],
        [
          '“Furniture included”',
          'Specify whether this means selection advice, documentation, purchasing, or installation.',
          'Fees, purchasing authority, delivery, and installation responsibilities.',
        ],
      ],
      [link('templates/interior-design-scope-of-work/', 'Define the boundary in a scope outline')],
    ),
    step: 'Check every proposed output against your actual services; separate unpriced items, allowances, and exclusions.',
    pilot:
      'If proposed deliverables and actual project handoffs drift apart, discuss the workflow with OpenLintel before any pilot commitment.',
  },
  'scope-of-work': {
    section: example(
      'Name the interface, not just the exclusion',
      [
        'An exclusion tells readers what you will not do, but it does not tell the next person where the missing information comes from. Use the responsibilities field to name the provider and reviewer when agreed. An unappointed role stays unappointed.',
        'A scope update should identify the changed output and its effect on services, reviews, and timing before replacing the baseline. This planning structure does not establish legal responsibility.',
      ],
      ['Output or interface', 'Sample boundary', 'Next information request'],
      [
        [
          'Room geometry',
          'Nominal source only; no survey supplied.',
          'Who provides and checks the measured room record?',
        ],
        [
          'J-01 joinery',
          'Concept elevation, not fabrication documentation.',
          'Who develops fabrication details and coordinates site conditions?',
        ],
        [
          'FF&E',
          'Proposed selections, not purchases.',
          'Who reviews suppliers and has authority to place orders?',
        ],
      ],
      [
        link(
          'resources/interior-design-handoff-package/',
          'Define an issue package and its recipients',
        ),
      ],
    ),
    step: 'Review each exclusion for an unresolved interface; name the needed provider without inventing an appointment.',
    pilot:
      'Use a pilot discovery conversation to examine where responsibility becomes unclear between your design outputs and the next team.',
  },
  budget: {
    section: example(
      'Read the known subtotal without losing the unknowns',
      [
        'The example has two priced teaching lines, totaling USD 1,850 against entered allowances of USD 2,000. The USD 150 remainder is the difference for those known inputs only. FIN-02 has no quantity or rate, so the workbook cannot establish a complete room budget.',
        'Enter an allowance as an explicitly labeled assumption, not as a supplier quote. Keep quote date, currency, exclusions, and any included delivery or installation amounts in Notes. A blank additional allowance contributes zero to the calculation; it does not prove there are no additional costs.',
        'When adding rows, extend formulas and the subtotal range as needed. Preserve calculated columns G and I; check a known line and an unresolved line after editing. The workbook is an editable planning aid, not an accounting system.',
      ],
      ['Line', 'Inputs and calculated result', 'Decision supported'],
      [
        [
          'F-01',
          '1 × USD 1,200 + USD 100 = USD 1,300; allowance USD 1,500.',
          'USD 200 remaining against this illustrative line allowance.',
        ],
        [
          'F-02',
          '1 × USD 500 + USD 50 = USD 550; allowance USD 500.',
          'USD 50 over the illustrative line allowance.',
        ],
        [
          'FIN-02',
          'Quantity and rate blank; total unresolved.',
          'Obtain measured scope and pricing; do not call the line free.',
        ],
      ],
      [
        link(
          'resources/interior-design-specification-change/',
          'Review cost effects when a selection changes',
        ),
      ],
    ),
    step: 'After adding or removing lines, verify formula ranges and report known totals alongside all unpriced scope.',
    pilot:
      'If a selection change reaches the drawing but misses the budget, discuss that coordination gap in a pilot discovery conversation.',
  },
  'spec-sheet': {
    section: example(
      'Follow one reference across a revision',
      [
        'The specification owns product identity and sourced attributes. The FF&E schedule owns where an item belongs and its quantity; the finish schedule owns surface assignments. A drawing locates or describes the item. Keep these roles explicit so copying information does not create several competing sources.',
        'Suppose a different sofa is proposed for F-01. Preserve the old issue, record the candidate as a proposed revision, and identify each affected record. A stable F-01 reference means the design slot remains traceable; it does not mean the replacement is automatically suitable or approved.',
      ],
      ['Record', 'Current example', 'Review if F-01 changes'],
      [
        [
          'Specification',
          'Linen sofa concept; model and dimensions unresolved; R0.',
          'Candidate model, dimensions, finish, supplier source, and revision.',
        ],
        [
          'WR-01 plan',
          'F-01 locates the proposed seating.',
          'Selected product envelope and its relationship to movement and other furniture.',
        ],
        [
          'FF&E schedule',
          'One item; pending review; not ordered.',
          'Whether quantity or placement changes; keep order status independent.',
        ],
        [
          'Budget and timeline',
          'Teaching allowance; no actual supplier commitment.',
          'Current quote, additional costs, lead-time evidence, and decision timing.',
        ],
      ],
      [
        link(
          'resources/interior-design-specification-change/',
          'Work through a complete specification change',
        ),
      ],
    ),
    step: 'Before issuing a revision, trace the item through its plan, schedule, budget, and decision record; preserve the prior issue.',
    pilot:
      'If product information changes in one document but not the others, bring a non-confidential example of that problem to a pilot discovery conversation.',
  },
  'ffe-schedule': {
    section: example(
      'Reconcile quantities without double counting',
      [
        'Count an item once in its room register even when it appears in a plan, elevation, and presentation. Those views are references to the selection, not additional purchases. If one reference covers several instances, make the quantity and unit explicit.',
        'The template does not generate orders or check stock. Keep the Approval column specific about the decision it records, and use Order / delivery only for supported purchasing facts. A selection may be visually accepted while product information is still being reviewed.',
      ],
      ['Reference', 'Register treatment in this library', 'Common mistake to avoid'],
      [
        [
          'F-01',
          'One proposed sofa in The Window Room; specification F-01.',
          'Counting the sofa again when shown on a presentation board.',
        ],
        [
          'F-02',
          'One proposed reading chair; model information remains open.',
          'Treating a generic furniture symbol as a verified purchasing size.',
        ],
        [
          'T-01',
          'One loose rug recorded as an item.',
          'Mixing item count with floor area or an assumed roll quantity.',
        ],
        [
          'J-01 / FIN-01',
          'Joinery links to drawing/specification; retained floor to finishes.',
          'Silently applying a different classification without telling the team.',
        ],
      ],
      [
        link(
          'resources/interior-design-approval-states/',
          'Separate selection, technical review, and purchasing approval',
        ),
      ],
    ),
    step: 'Reconcile each stable reference against the plan once, then check its specification and purchasing unit before sharing.',
    pilot:
      'Use a pilot discovery conversation to examine repeated counting, missing specifications, or approval ambiguity in your FF&E workflow.',
  },
  'finish-schedule': {
    section: example(
      'Separate a surface assignment from a purchasing quantity',
      [
        'Use a distinct row when the application changes. “Walls” is adequate only while it honestly describes one unresolved treatment; if a feature wall or different preparation is introduced, identify the relevant wall face and split the record. Keep the finish code stable when the same finish is reused.',
        'A measured area still needs product-specific planning before it becomes a purchase quantity. This template does not choose coverage, waste, coats, preparation, or installation methods. Obtain the appropriate product information and project review rather than inferring those details from the sample palette.',
      ],
      ['Surface', 'Current example', 'What cannot be inferred'],
      [
        [
          'Floor / FIN-01',
          '20 m² nominal footprint; existing oak retained.',
          'An order quantity, replacement scope, or verified floor condition.',
        ],
        [
          'Walls / FIN-02',
          'Warm mineral finish; measured area unresolved.',
          'Wall area from floor area, substrate suitability, or product coverage.',
        ],
        [
          'Future exception',
          'Separate wall-face row if a different treatment is proposed.',
          'That one room-wide description automatically includes the exception.',
        ],
      ],
      [
        link(
          'resources/brief-to-coordinated-schedules/',
          'See finishes in the connected record chain',
        ),
      ],
    ),
    step: 'Split rows for different applications or preparation conditions, and keep measured area separate from purchasing assumptions.',
    pilot:
      'If finish changes become disconnected from room surfaces or drawings, discuss that handoff in a pilot discovery conversation.',
  },
  'room-data': {
    section: example(
      'Keep the source with the room requirement',
      [
        'Treat each row as a statement with provenance, not a container for a number. “The client wants storage” and “the wall is this long” need different evidence. A proposed dimension is not made verified by being copied into the room register.',
        'When a new survey differs from a nominal source, keep the discrepancy visible until it has been resolved. Then update dependent drawings and schedules through an identified issue, rather than quietly replacing the number everywhere.',
      ],
      ['Entry', 'Source and current status', 'Action before reliance'],
      [
        [
          '5000 mm length',
          'Illustrative fixture; nominal, not surveyed.',
          'Obtain a room record with reference points and units.',
        ],
        [
          'Reading and storage',
          'Sample brief; intended use.',
          'Confirm priorities with the relevant decision-maker.',
        ],
        [
          'FIN-01 retained floor',
          'Sample brief and WR-01.',
          'Review condition and any proposed intervention separately.',
        ],
      ],
      [
        link(
          'templates/interior-design-site-survey-checklist/',
          'Capture the measured source record',
        ),
      ],
    ),
    step: 'Check changed source information against all dependent documents before replacing the current room record.',
    pilot:
      'If your team repeatedly re-enters room information without its source or confidence, discuss the workflow in a pilot discovery conversation.',
  },
  timeline: {
    section: example(
      'Respond to a missing decision, not just a late task',
      [
        'The workbook is a dependency planner, not an automatic scheduler. Write what must be available for the next review, then assign dates using your actual scope and participants. A supplied lead time should retain its source and confirmation date in your project records.',
        'If a prerequisite moves, review dependent activities explicitly. Do not shift dates by an arbitrary standard duration or mark the dependency complete to make the plan look on time.',
      ],
      ['Dependency', 'If unresolved', 'Record the response'],
      [
        [
          'Agreed brief',
          'Concept studies may answer an unconfirmed problem.',
          'Identify the missing decision and its owner before planning the next review.',
        ],
        [
          'Final F-01 model',
          'Layout, quote, and delivery information may change.',
          'Review affected activities; dates remain to agree in this example.',
        ],
        [
          'Coordination review',
          'An issue package may contain mixed revisions.',
          'Record outstanding items and whether they prevent the intended handoff.',
        ],
      ],
      [
        link(
          'resources/interior-design-specification-change/',
          'Trace a changed selection into the timeline',
        ),
      ],
    ),
    step: 'When a prerequisite changes, review affected dates with their owners and preserve the reason for the revision.',
    pilot:
      'If project dates hide unresolved design decisions, use a pilot discovery conversation to examine where those dependencies are lost.',
  },
  'site-survey': {
    section: example(
      'Write a note that survives the site visit',
      [
        'A useful record distinguishes a measured observation from a provided number, visual observation, or inaccessible condition. Keep the room reference, location, instrument reference point, unit, and source together. Do not overwrite conflicting readings until their cause is understood.',
        'For a US project, choose a primary dimension convention and document how feet, inches, fractions, or decimal units are recorded. The example remains nominal metric data. A display conversion or a drawing that looks square does not increase survey confidence.',
      ],
      ['Weak note', 'Better record structure', 'Sample limitation'],
      [
        [
          '“Wall 5”',
          'Room, identified wall/run, start and end references, value, unit, source.',
          '5000 mm is a fixture value, not a field observation.',
        ],
        [
          '“Window as photo”',
          'Opening ID, measured offsets/sizes, operation, linked photograph reference.',
          'Opening dimensions and site photographs are not supplied.',
        ],
        [
          '“Services checked”',
          'Visible device positions and access limits; specialist information still required.',
          'No concealed-service or suitability assessment represented.',
        ],
      ],
      [link('resources/how-to-measure-a-room/', 'Review measurement recording and checks')],
    ),
    step: 'Label each source as measured, provided, observed, or unresolved; preserve access limitations with the record.',
    pilot:
      'If survey notes lose context when transferred to room data or drawings, discuss that transfer problem in a pilot discovery conversation.',
  },
  presentation: {
    section: example(
      'Ask for one decision at the right level',
      [
        'This download is a DOCX presentation storyboard: editable text fields and image-placement prompts, not a finished slide deck, PPTX, PDF, or Canva file. Its purpose is to settle the sequence and decision request before layout work in your chosen presentation tool.',
        'Write the decision request first, then remove slides that do not support it. Keep the source and status beside every image. After the meeting, transfer the actual decision and unresolved questions to your project record; the fact that a board was shown is not approval.',
      ],
      ['Storyboard moment', 'Useful question', 'Not settled by that answer'],
      [
        [
          'Brief recap',
          'Are reading, conversation, and storage still the priorities?',
          'Survey dimensions or a changed service scope.',
        ],
        [
          'Quiet Oak versus Deep Olive',
          'Which material direction should be developed, and why?',
          'Exact products, price, or technical suitability.',
        ],
        [
          'WR-01 and selections',
          'What needs further investigation before the next review?',
          'Purchasing or construction authorization.',
        ],
      ],
      [link('resources/interior-design-approval-states/', 'Record the type of approval requested')],
    ),
    step: 'After presenting, write a separate decision record; do not treat slide comments or image selection as blanket approval.',
    pilot:
      'If presentation feedback becomes disconnected from specifications, discuss the decision-to-document handoff in a pilot discovery conversation.',
  },
};

export function enrichTemplate(item) {
  const entry = guidance[item.id];
  if (!entry) throw new Error(`Missing authored guidance for template: ${item.id}`);
  return {
    ...item,
    title:
      item.id === 'presentation'
        ? 'Interior design presentation storyboard template (DOCX)'
        : item.title,
    use: `${item.use} ${entry.step}`,
    sections: [entry.section],
    unitsNote: item.budget
      ? 'US-first examples use USD teaching figures, not current market prices. Use one currency; keep tax, delivery, installation, and other cost assumptions explicit. Do not infer a tax rate from this example.'
      : 'The worked example keeps its original nominal metric dimensions. For a US project, choose and label a primary imperial or metric convention, distinguish item counts from areas, and document any display conversion and rounding. Never relabel metric values as imperial or treat conversion as site verification.',
    pilot: entry.pilot,
    modified: '2026-09-15',
  };
}
