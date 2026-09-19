// Authored exercises, not client cases, professional review, or product capability claims.
const section = (id, title, paragraphs, items = [], table, links = []) => ({
  id,
  title,
  paragraphs,
  items,
  table,
  links,
});
const table = (
  headers,
  rows,
  caption = 'Illustrative teaching exercise · No actual approval or project outcome',
) => ({ headers, rows, caption });
const link = (href, label) => ({ href, label });

export const workflowGuides = [
  {
    id: 'concept-vs-documents',
    slug: 'ai-concept-images-vs-design-documentation',
    title: 'AI concept images vs. dimensioned design documentation',
    cluster: 'design',
    wave: 1,
    description:
      'Use an annotated room example to distinguish visual intent, dimensioned drawings, sourced product information, and decisions that still need review.',
    intro:
      'A convincing room image can be useful without being a reliable record of a room. The practical question is not whether an image looks finished, but which decisions its evidence can support.',
    visual: 'concept',
    sample: 'design',
    related: ['space-planning', 'spec-sheet', 'software-evaluation'],
    pilot:
      'If your studio is trying to move from visual concepts to traceable project information, discuss the missing steps in a pilot discovery conversation.',
    sections: [
      section(
        'evidence',
        'Separate the image from its evidence',
        [
          'An AI-generated concept can communicate atmosphere, broad material relationships, or an idea for how a room might feel. It does not, by itself, establish what was measured, which manufactured products are shown, or whether an assembly can be installed. Writing a dimension in a prompt is not a measured survey.',
          'The Window Room uses Quiet Oak to communicate a selected illustrative direction. Its nominal 5000 × 4000 mm source data, WR-01 plan, WR-02 elevation, and material register are separately authored sample artifacts. They demonstrate a connection between records; the image is not the source of verified dimensions and the artifacts are not a proven application export.',
        ],
        [],
        table(
          ['What you can see', 'What the sample establishes', 'What remains unverified'],
          [
            [
              'Oak flooring and warm walls',
              'The brief retains FIN-01 and proposes FIN-02.',
              'Floor condition, exact finish products, substrate, wall area.',
            ],
            [
              'A linen sofa',
              'F-01 communicates a proposed seating direction.',
              'Model, size, supplier, fabric reference, current quote.',
            ],
            [
              'Low joinery',
              'J-01 is linked to a nominal WR-02 elevation.',
              'Fabrication, fixings, tolerances, site fit, specialist review.',
            ],
          ],
        ),
      ),
      section('document', 'Dimensioned does not mean verified', [
        'A dimensioned drawing is more explicit than an image, but its reliability still depends on inputs, purpose, and review. Read its source, units, revision, and intended use. A precise number can describe nominal geometry just as precisely as it describes a measured condition.',
        'WR-02 shows three nominal 800 mm modules. That is useful for understanding the illustrative proportion of J-01, not for ordering cabinetry. Do not scale the displayed image or infer omitted construction information. Development for a real project requires verified inputs and the appropriate qualified team.',
      ]),
      section(
        'transfer',
        'Convert visual feedback into named questions',
        [
          'Start a transition record rather than trying to extract a complete specification from the image. Name the part being discussed, state what the feedback actually means, and identify the evidence required next. Keep the visual available for context, but do not let it silently become the authority for every detail.',
          'For example, “keep the pale oak” becomes a request to investigate a finish direction for J-01. It is not a manufacturer selection. “The sofa should feel lighter” needs clarification: color, visual bulk, fabric, or actual size could each imply different changes.',
        ],
        [
          'Record the brief requirement behind the visual choice.',
          'Give the affected item or surface a stable reference.',
          'Separate selected direction from unresolved dimensions and products.',
          'Name the information source and reviewer needed for the next decision.',
          'Carry the unresolved questions into the current issue, not just presentation notes.',
        ],
        undefined,
        [
          link('templates/interior-design-spec-sheet/', 'Create the product information record'),
          link('templates/room-data-sheet/', 'Keep dimension sources beside room information'),
        ],
      ),
      section(
        'review',
        'Use a small test before trusting a workflow',
        [
          'Take one non-confidential room and one item. Can a colleague move from the concept to the item record, identify the current drawing revision, and tell what is unresolved without asking you? If not, improve that trace before expanding the workflow to a full project.',
          'When evaluating software, ask for the same exercise in a live, reproducible workflow. A polished video or sample download is useful communication, but neither demonstrates all the capabilities of a working product. OpenLintel remains in active development; check its product status before discussing a pilot.',
        ],
        [],
        undefined,
        [link('product-status/', 'Check demonstrated and planned OpenLintel capabilities')],
      ),
    ],
    checklist: [
      'Are concept imagery and measured sources labeled differently?',
      'Can each important visual choice lead to a named item or surface record?',
      'Are unresolved details visible without implying construction or purchasing readiness?',
    ],
  },
  {
    id: 'brief-to-schedules',
    slug: 'brief-to-coordinated-schedules',
    title: 'From a residential design brief to coordinated schedules',
    cluster: 'coordinate',
    wave: 1,
    description:
      'Follow F-01 seating, J-01 joinery, and FIN-02 walls from brief requirements into plans, specifications, FF&E, and finish schedules without duplicating authority.',
    intro:
      'The useful connection between documents is not a shared logo or filename. It is the ability to follow one requirement into a selection, its location, the relevant evidence, and the next unresolved decision.',
    visual: 'ffe',
    sample: 'materials',
    related: ['design-brief', 'ffe-schedule', 'finish-schedule'],
    pilot:
      'If brief decisions are repeatedly re-entered across drawings and schedules, discuss the record chain and where it breaks in a pilot discovery conversation.',
    sections: [
      section('starting-point', 'Start with a need, not a row of products', [
        'The Window Room brief calls for reading, conversation, and storage while retaining the floor and openings. These requirements do not prescribe an exact sofa, joinery construction, or wall coating. They explain why information will be needed and what a later choice should serve.',
        'Use the questionnaire to collect perspectives and the brief to record agreed intent. A drawing locates relationships. A specification records an item’s sourced attributes. Schedules organize placement, quantities, or surface assignments. These are the library’s conventions; agree the roles with your actual project team.',
      ]),
      section(
        'trace',
        'Trace three different kinds of information',
        [
          'Keep identifiers stable enough that another person can follow the chain. The table follows the original illustrative fixture; it adds no real client decision, measured quantity, or supplier evidence. Notice that some cells should remain unresolved.',
        ],
        [],
        table(
          [
            'Brief requirement',
            'Reference and drawing relationship',
            'Record that owns the detail',
            'Open question',
          ],
          [
            [
              'Conversation',
              'F-01 seating position in WR-01.',
              'Specification: product identity. FF&E: one proposed item.',
              'Final model, dimensions, supplier, and fabric.',
            ],
            [
              'Storage',
              'J-01 in WR-01 and the WR-02 elevation.',
              'Joinery drawing and specification, linked by J-01.',
              'Site dimensions, construction details, responsible maker and reviewer.',
            ],
            [
              'Selected material direction',
              'FIN-02 proposed wall treatment.',
              'Finish schedule: surface assignment. Specification: actual product when selected.',
              'Wall area, substrate, exact product, and preparation requirements.',
            ],
          ],
        ),
      ),
      section(
        'authority',
        'Decide where each fact belongs',
        [
          'Avoid copying the supplier model into five editable files unless you also have a clear update procedure. Keep its authoritative record identifiable and use references elsewhere. If a display copy is necessary, identify the source revision so it can be checked during an issue review.',
          'Do not force every kind of quantity into one register. One sofa is an item count. The sample’s 20 m² is a nominal floor footprint. Neither gives the wall-finish purchase quantity. The finish register can therefore contain a valid surface assignment with an unresolved area.',
        ],
        [
          'Use one room reference throughout the package.',
          'Connect each significant plan item to a specification or an explicit open information request.',
          'Check quantities against the correct unit and application.',
          'Keep the source, review state, and revision with the information it describes.',
        ],
        undefined,
        [
          link('templates/interior-design-spec-sheet/', 'Record product attributes'),
          link('templates/ffe-schedule/', 'Register room quantities'),
          link('templates/finish-schedule/', 'Assign finishes to surfaces'),
        ],
      ),
      section(
        'change',
        'Test the chain with one proposed change',
        [
          'Imagine the proposed F-01 sofa changes. Begin in the product record, then review the plan, quantity register, budget, and timing. The brief may stay the same: the room still needs conversation seating. A product change and a brief change are different events even when both require review.',
          'Document which records changed and which were checked but remained unchanged. Preserve the previous issue and identify the current coordinated set. This is a manual teaching workflow, not a claim that OpenLintel already synchronizes those records automatically.',
        ],
        [],
        undefined,
        [
          link(
            'resources/interior-design-specification-change/',
            'Work through the specification-change exercise',
          ),
        ],
      ),
    ],
    checklist: [
      'Does each requirement connect to a relevant record without prematurely specifying a product?',
      'Is the authoritative source for each fact identifiable?',
      'Could a colleague trace a change through the affected records and find the unresolved work?',
    ],
  },
  {
    id: 'specification-change',
    slug: 'interior-design-specification-change',
    title: 'Managing an interior design specification change',
    cluster: 'handoff',
    wave: 1,
    description:
      'Work through a proposed F-01 sofa change with a before-and-after record, impact table, approval boundaries, and a coordinated issue checklist.',
    intro:
      'A replacement selection is not a find-and-replace operation. Even when the room reference stays the same, dimensions, cost assumptions, review status, and the next issue may all need attention.',
    visual: 'decisions',
    sample: 'handoff',
    related: ['spec-sheet', 'budget', 'timeline', 'approval-states'],
    pilot:
      'If revisions are your coordination bottleneck, discuss one non-confidential example of a change that was hard to track in a pilot discovery conversation.',
    sections: [
      section(
        'baseline',
        'Preserve the baseline before discussing the candidate',
        [
          'The original Window Room F-01 record is a linen two-seat sofa concept, quantity one, with model and dimensions unresolved. It remains R0, pending review, and not ordered. The exercise below proposes a replacement review; it does not change the published sample or create an actual R1 approval.',
          'Name a change record in your own project system and state what prompted it. Preserve the current specification and linked issue. Record who requested the change only when known; a request is not authority to purchase.',
        ],
        [],
        table(
          ['Field', 'Current illustrative baseline', 'Proposed-change exercise'],
          [
            [
              'Reference',
              'F-01, The Window Room.',
              'Keep F-01 while reviewing the replacement for the same design role.',
            ],
            [
              'Selection',
              'Linen two-seat sofa concept.',
              'Candidate alternative; no real model selected in this exercise.',
            ],
            [
              'Evidence',
              'No verified model, dimensions, or quote.',
              'Request candidate information and identify its source.',
            ],
            [
              'State',
              'R0; pending review; not ordered.',
              'Change under review; no new issue or purchasing approval represented.',
            ],
          ],
        ),
      ),
      section(
        'impact',
        'Review the affected records together',
        [
          'Use an impact record to distinguish “changed,” “checked and unchanged,” and “still unresolved.” Do not mark a document unaffected just because nobody has opened it yet. A replacement can keep quantity one while still changing the footprint, finish, delivery route, or cost assumptions.',
        ],
        [],
        table(
          ['Record to inspect', 'Question to answer', 'Evidence before closing the item'],
          [
            [
              'Specification F-01',
              'What exactly is the candidate?',
              'Sourced model, dimensions, finish, supplier information, and remaining limitations.',
            ],
            [
              'WR-01 plan',
              'Does the actual envelope change the proposed relationships?',
              'Appropriate dimensional and movement review using verified project inputs.',
            ],
            [
              'FF&E register',
              'Does count, room placement, or purchasing unit change?',
              'Reconciled item record; not a new item merely because it appears in another view.',
            ],
            [
              'Budget',
              'Which quote or allowance is affected?',
              'Dated source, currency, inclusions, additional costs, and unresolved lines.',
            ],
            [
              'Timeline',
              'Does the replacement affect a dependency?',
              'Confirmed supplier information and an agreed decision sequence; no guessed dates.',
            ],
            [
              'Presentation / handoff',
              'Would recipients still see the superseded selection?',
              'Current issue index and clearly labeled superseded material.',
            ],
          ],
        ),
      ),
      section(
        'decisions',
        'Keep the three decisions separate',
        [
          'The client may prefer the replacement visually. A relevant professional may still need to review its suitability for the project. The purchasing party may still need current commercial information and authority. Record the actual decision, scope, person, and source rather than applying one “approved” label to all three.',
          'If a candidate is rejected, retain the outcome and reason with the baseline. If it advances but dimensions remain unresolved, the next issue must show that limitation. Do not make an issue appear coordinated by hiding open work.',
        ],
        [],
        undefined,
        [link('resources/interior-design-approval-states/', 'Use distinct approval records')],
      ),
      section(
        'issue',
        'Release an identifiable set, not several unrelated finals',
        [
          'Once the required review for the intended use is complete, update the affected records together and publish an issue index. Identify what changed and the recipients who need it. Preserve the superseded issue in the project system, with its status clear so it is not accidentally reused.',
          'Have someone follow F-01 from the current plan to its specification and register without relying on memory. Check the budget and timeline entries against the same change. If a record remains open, name the next action and whether that gap prevents the proposed use of the issue.',
        ],
        [
          'Record the request, candidate, and unchanged baseline.',
          'Inspect and classify all affected records.',
          'Obtain the distinct reviews needed for the intended next action.',
          'Issue a current index and change summary with unresolved items visible.',
        ],
        undefined,
        [link('resources/interior-design-handoff-package/', 'Assemble the current issue package')],
      ),
    ],
    checklist: [
      'Is the prior issue preserved and the proposed change clearly distinguished?',
      'Does the impact record include budget, timing, and downstream views?',
      'Is every approval limited to the decision actually made?',
    ],
  },
  {
    id: 'handoff-package',
    slug: 'interior-design-handoff-package',
    title: 'What belongs in an interior design handoff package?',
    cluster: 'handoff',
    wave: 1,
    description:
      'Build an identifiable issue index with document purpose, revisions, recipients, responsibilities, and open questions using the illustrative Window Room package.',
    intro:
      'A handoff is successful when the next person understands what they received, what it can be used for, and what still needs resolution. File count alone cannot establish completeness.',
    visual: 'drawing-index',
    sample: 'handoff',
    related: ['drawing-checklist', 'scope-of-work', 'specification-change'],
    pilot:
      'If recipients cannot tell which documents are current or what still needs review, discuss your handoff workflow in a pilot discovery conversation.',
    sections: [
      section('purpose', 'Define the purpose and recipient first', [
        'A concept-review package, supplier enquiry, and construction issue do different jobs. Begin by stating the proposed use and recipient. Then determine what information and review are necessary for that use with the actual project team and agreed scope.',
        'This guide demonstrates an illustrative design-discussion handoff only. It is not a universal deliverables list and has not received independent professional review. Project-specific construction, fabrication, permit, and specialist documentation require appropriate professional development and review.',
      ]),
      section(
        'index',
        'Create an index that explains the issue',
        [
          'List actual documents rather than the documents you wish the package contained. For each, show an identifier, issue or revision, purpose, and unresolved boundary. An index should make omissions easier to see, not disguise them behind a polished cover.',
        ],
        [],
        table(
          ['Artifact in the sample', 'Purpose', 'Status and important limitation'],
          [
            [
              'Brief and selected Quiet Oak direction',
              'Explain intended use and material direction.',
              'Illustrative; no real client approval.',
            ],
            [
              'WR-01 / R0 furnished plan',
              'Locate proposed furniture and J-01.',
              'Nominal inputs; pending review; do not scale or build.',
            ],
            [
              'WR-02 / R0 joinery elevation',
              'Describe the J-01 concept proportion.',
              'Not fabrication information; details and site fit unresolved.',
            ],
            [
              'Partial materials schedule',
              'Connect item and finish references.',
              'Not a complete takeoff or purchasing list.',
            ],
            [
              'Printable sample summary',
              'Summarize the illustrative set.',
              'Does not upgrade the status of the underlying records.',
            ],
          ],
        ),
      ),
      section('missing', 'Keep teaching additions out of the actual issue index', [
        'The resources library also includes an RCP teaching diagram, budget workbook, and other planning templates. Their availability does not mean they are actual Window Room deliverables. The ceiling diagram is not WR-03; the USD budget figures are teaching allowances, not a supplied project estimate.',
        'When adapting the method, put draft or reference-only material in a clearly separate category. Do not let an unreviewed attachment acquire the status of the main issue simply because it was included in the same folder.',
      ]),
      section(
        'open-items',
        'Give unresolved information a useful next step',
        [
          'An open-item record needs a question, the affected information, the next evidence required, and an actual owner when appointed. Leave owner and timing unresolved if no one has agreed them; invented names or dates make the handoff less reliable.',
        ],
        [],
        table(
          ['Open item', 'Affected record', 'Next information required'],
          [
            [
              'F-01 final product',
              'Specification, plan, FF&E, budget.',
              'Verified model and dimensions; supplier information; required reviews.',
            ],
            [
              'FIN-02 wall area',
              'Finish register and later quantity planning.',
              'Measured surface scope and suitable product-specific information.',
            ],
            [
              'J-01 development',
              'WR-02 and specification.',
              'Verified site input and appropriate fabrication and technical development.',
            ],
          ],
        ),
      ),
      section(
        'send',
        'Record the issue and confirm the next action',
        [
          'Keep the issued set, index, intended use, recipient list, and change summary together in your project system. Distinguish acknowledgement of receipt from agreement, professional review, or purchasing authority. A downloaded file only proves someone initiated a download, not that the information was understood.',
          'Ask a recipient to locate a reference, identify the current revision, and describe the next action. Use any ambiguity to improve the issue. The educational drawing checklist can support that conversation but cannot certify a project package.',
        ],
        [],
        undefined,
        [
          link('resources/interior-design-drawing-checklist/', 'Review the indexed drawing set'),
          link('templates/interior-design-scope-of-work/', 'Check agreed deliverable boundaries'),
        ],
      ),
    ],
    checklist: [
      'Does the index list only actual issue contents with their true status?',
      'Are recipients and intended use explicit?',
      'Can the next person identify each unresolved item and what must happen before reliance?',
    ],
  },
  {
    id: 'approval-states',
    slug: 'interior-design-approval-states',
    title: 'Client approval, technical review, and purchasing approval',
    cluster: 'handoff',
    wave: 1,
    description:
      'Distinguish visual selection, project-specific technical review, and purchasing authority with a sample approval matrix and precise decision-record examples.',
    intro:
      '“Approved” is incomplete unless it says what was approved, by whom, for which use, and against which revision. One green status can hide three different decisions.',
    visual: 'procurement',
    sample: 'materials',
    related: ['presentation', 'ffe-schedule', 'project-management', 'specification-change'],
    pilot:
      'If a single approval label creates confusion in your studio, discuss how decisions should stay connected to their documents in a pilot discovery conversation.',
    sections: [
      section(
        'distinguish',
        'Give each decision a separate purpose',
        [
          'Practices use different names and responsibility structures. Agree your own terms with the project team and relevant agreements. The model here is an educational way to avoid conflating a preference, a project-specific review, and permission to spend; it does not assign legal responsibility.',
        ],
        [],
        table(
          ['Decision', 'Question it answers', 'What it does not establish'],
          [
            [
              'Client selection',
              'Does this option serve the agreed aesthetic or functional intent under discussion?',
              'Verified dimensions, technical suitability, or authority for someone else to order.',
            ],
            [
              'Technical review',
              'Has the relevant qualified party reviewed the specified issue for the stated purpose?',
              'A blanket guarantee, unrelated specialist review, or client spending approval.',
            ],
            [
              'Purchasing approval',
              'Is the identified party authorized to commit to the defined item and commercial basis?',
              'That every design or technical question is resolved unless explicitly included in the process.',
            ],
          ],
        ),
      ),
      section(
        'sample',
        'Read the Window Room without upgrading its status',
        [
          'Quiet Oak is selected within the illustrative narrative. The actual sample drawings remain R0 and pending review. F-01 remains an unresolved sofa concept and is not ordered. These statements are compatible because they describe different parts of the workflow.',
          'A reader should never have to infer whether “selected” means “buy it.” Keep product identity, quote evidence, dimensions, and unresolved questions alongside the relevant status. Do not replace missing information with an approval icon.',
        ],
        [],
        table(
          ['Sample record', 'Accurate statement', 'Misleading shortcut'],
          [
            [
              'Quiet Oak direction',
              'Selected illustrative material direction.',
              '“Client-approved completed design.”',
            ],
            [
              'WR-01 and WR-02',
              'R0 illustrative drawings, pending review.',
              '“Ready for construction.”',
            ],
            [
              'F-01 sofa',
              'One proposed item; model not specified; not ordered.',
              '“Approved purchase.”',
            ],
          ],
        ),
      ),
      section(
        'record',
        'Write a decision someone can interpret later',
        [
          'Use a short record with the item or document reference, revision, exact question, outcome, evidence, decision-maker, and limitations. Do not fabricate a reviewer or approval date. The purpose is not to create paperwork for its own sake, but to preserve the boundaries that informal meeting notes often lose.',
          'For an illustrative exercise, write: “F-01: compare a candidate sofa against the seating brief; no model selected; dimensions and supplier information required; owner to appoint.” It remains an open action. A real decision record should instead name the actual person and dated source once the decision occurs.',
        ],
        [
          'Record what the reviewer saw, including the revision.',
          'State selected, rejected, or still under review with the actual conditions.',
          'Identify any remaining work that prevents the next intended action.',
          'Keep the source record in the project system; do not paste private correspondence into a public resource.',
        ],
      ),
      section(
        'change',
        'Revisit the relevant decision when the evidence changes',
        [
          'A changed model, dimension, finish, price, or project condition can make a prior decision incomplete for the new candidate. Check the scope of the original decision rather than either assuming it carries forward or asking for blanket reapproval of everything.',
          'If only the visual direction was selected, a later supplier quote is a separate input. If the candidate product changes after a review, identify what the reviewer must reconsider. Preserve the previous record and link the new decision to the change instead of overwriting history.',
        ],
        [],
        undefined,
        [
          link(
            'resources/interior-design-specification-change/',
            'Trace a change through decisions and documents',
          ),
          link('templates/ffe-schedule/', 'Keep selection and order status separate'),
        ],
      ),
    ],
    checklist: [
      'Does every approval name the actual decision and revision?',
      'Are selection, relevant technical review, and purchasing authority distinguishable?',
      'Will a changed input trigger a review of the affected decision rather than inherit a vague status?',
    ],
  },
  {
    id: 'software-evaluation',
    slug: 'evaluating-ai-interior-design-software',
    title: 'How to evaluate AI interior design software for a studio',
    cluster: 'discover',
    wave: 1,
    description:
      'Run a practical, evidence-based studio software evaluation covering one room, source records, a controlled change, exports, review boundaries, and client-data handling.',
    intro:
      'Evaluate the job your studio needs done, not the number of features on a landing page. A small repeatable test can reveal more than a gallery of impressive room images.',
    visual: 'process',
    sample: 'handoff',
    related: ['concept-vs-documents', 'brief-to-schedules', 'project-management'],
    pilot:
      'OpenLintel is in active development, not a guaranteed hosted trial. Bring your evaluation requirements to a pilot discovery conversation and compare them with the product’s verified status.',
    sections: [
      section('job', 'Choose one workflow and an acceptable outcome', [
        'Begin with a concrete problem: repeated room-data entry, ambiguous specification revisions, or a handoff whose current files are difficult to identify. Avoid “make design faster” as the sole acceptance criterion. Decide what a colleague should be able to do at the end without relying on the person who prepared the work.',
        'Use a fictional or permitted non-confidential test project. Keep the brief, room data, and requested outputs the same across products. Name which outputs are essential now and which would be useful later. This guide does not rank vendors or imply that OpenLintel currently satisfies every test.',
      ]),
      section(
        'worksheet',
        'Use a worksheet based on observed evidence',
        [
          'Copy this table into your evaluation notes. For each row record the observed result, the software version or test date, the evidence retained, and any unresolved question. Use “demonstrated,” “partial,” “not observed,” or “not required” rather than treating a marketing claim as a passed test.',
        ],
        [],
        table(
          ['Test', 'What to ask the demonstrator to do', 'Evidence to retain'],
          [
            [
              'Source trace',
              'Show where a room dimension came from and how its confidence is represented.',
              'Source reference and behavior after correction.',
            ],
            [
              'One item across records',
              'Find the same furniture reference in its plan, specification, and quantity record.',
              'Current identifiers, fields, and any manual reconciliation required.',
            ],
            [
              'Controlled change',
              'Change one candidate selection and show what updates or remains open.',
              'Affected records, preserved history, and unresolved work.',
            ],
            [
              'Review boundary',
              'Distinguish a concept choice from technical review and purchasing state.',
              'Actual available states and who can change them.',
            ],
            [
              'Export and reuse',
              'Export the required formats and open them in your receiving tools.',
              'Readable files, editability, retained references, and known losses.',
            ],
            [
              'Client-data handling',
              'Explain actual storage, external processing, retention, access, and deletion.',
              'Current policy/configuration evidence and unanswered questions.',
            ],
          ],
          'Evaluation worksheet · Authored test questions, not product scores',
        ),
      ),
      section('run', 'Run the test, including the inconvenient parts', [
        'Ask to see a small end-to-end sequence rather than unrelated finished screens. Enter the agreed inputs, create or locate the required records, introduce a change, and inspect the resulting issue. Note which steps are manual, which need another service, and where a human must review the result.',
        'A downloadable example is not proof of a live export function. An animated walkthrough is not proof that your own inputs are supported. Open files in the software your studio and collaborators actually use; a format name alone does not establish interoperability or that all fields survive.',
        'If measuring preparation effort, define the start and finish and include corrections and review. Repeat a comparable task before drawing conclusions. Do not turn a single demonstration into a claimed percentage saving.',
      ]),
      section('data', 'Examine data handling before uploading client work', [
        'Ask which systems receive uploaded images, drawings, and prompts; what is stored; which people can access it; and how deletion works. Check the actual configuration and applicable vendor terms with your organization’s responsible reviewer. A local interface or open-source license does not, by itself, mean all processing stays offline.',
        'Do not use a real home address, identifiable family information, or confidential project files merely to make a demonstration realistic. A fictional test can establish many workflow behaviors without that exposure. If an essential question cannot be answered, record it as unresolved before a real-project trial.',
      ]),
      section(
        'decision',
        'Make a decision that matches the evidence',
        [
          'Summarize the essential tasks demonstrated, manual work still required, critical gaps, implementation prerequisites, and the next test. Distinguish an experimental pilot from a production rollout. Choose a limited pilot only if the remaining uncertainty is acceptable for its intended use and the relevant people understand the limitations.',
          'For OpenLintel, start with the public product-status page and repository prerequisites. The Window Room and resource downloads are illustrative editorial assets, not customer outcomes or proof of a hosted application workflow. A discovery conversation is a way to compare your needs with active development; it does not guarantee access or pilot admission.',
        ],
        [],
        undefined,
        [
          link('product-status/', 'Read OpenLintel’s product status'),
          link('open-source/', 'Inspect source and setup prerequisites'),
        ],
      ),
    ],
    checklist: [
      'Are acceptance criteria tied to a real studio task?',
      'Did you observe the required workflow and inspect its exported results?',
      'Are privacy questions, review boundaries, and unproven capabilities explicitly unresolved rather than assumed?',
    ],
  },
];
