import { workflowGuides } from './workflow-guides.mjs';
import { enrichExistingGuide } from './guide-guidance.mjs';

const section = (id, title, paragraphs, items = []) => ({ id, title, paragraphs, items });
const aia = {
  title: 'AIA: defining the architect’s basic services',
  url: 'https://www.aia.org/resource-center/defining-the-architects-basic-services',
};
const leica = {
  title: 'Leica Geosystems: room measurements and diagonal verification',
  url: 'https://shop.leica-geosystems.com/measurement-tools/disto/blog/video/speed-precision-smart-room-diagonals',
};
const bricsys = {
  title: 'Bricsys documentation: define a reflected ceiling plan',
  url: 'https://help.bricsys.com/en-us/document/bricscad-bim/design-documentation/define-reflected-ceiling-plan',
};

export const guides = [
  {
    id: 'mood-board',
    modified: '2026-09-26',
    slug: 'interior-design-mood-board-examples',
    title: 'Interior design mood board examples',
    cluster: 'design',
    wave: 1,
    description:
      'Explore two annotated interior design mood boards for one illustrative room, with palette decisions, material references, and a client-review checklist.',
    intro:
      'A useful mood board communicates a direction, not a list of things to buy. These two assembled boards combine room references, palette swatches, and annotations to show how material and color choices change the conversation while the brief stays fixed. The presentation download includes editable versions.',
    visual: 'mood-boards',
    sections: [
      section('quiet-oak', 'Example 1: Quiet Oak', [
        'Quiet Oak is the selected route through The Window Room. The existing oak floor provides the starting reference, with pale oak joinery, warm mineral walls, and linen seating proposed around it. The board’s role is to explain that relationship, not to certify an exact color match.',
        'Read the board from the room image to the material references. FIN-01 is the retained floor; J-01 is the proposed joinery; FIN-02 is the wall finish still awaiting survey and specification. Keeping those references visible makes a later schedule easier to understand.',
      ]),
      section('deep-olive', 'Example 2: Deep Olive', [
        'Deep Olive explores darker joinery and olive upholstery in the same room. It is a comparison study, not a second completed project. Hold the room’s openings, retained floor, and functional brief constant so the client can discuss the material difference rather than an unrelated layout.',
        'The sample drawings continue with Quiet Oak. Do not carry olive upholstery into a specification merely because it appeared on an alternative board. Record the selection and archive alternatives with their status intact.',
      ]),
      section(
        'assemble',
        'Build a board with an argument',
        [
          'Start with a sentence describing the intended atmosphere. Choose a small set of references that support that sentence, then annotate what each contributes. A room image might explain light; a swatch might explain texture; a furniture silhouette might explain visual weight. If two images say the same thing, remove one.',
        ],
        [
          'Keep the brief and retained conditions visible.',
          'Use images you own or have permission to reproduce.',
          'Label concept imagery, material samples, and product photographs differently.',
          'Record what the board does not settle: dimensions, suppliers, quantities, cost, and technical suitability.',
        ],
      ),
      section('review', 'Turn visual feedback into a decision', [
        'Ask what the client wants to retain, change, or investigate. “Too dark” becomes more useful when attached to the joinery, upholstery, or overall contrast. Translate the discussion into a concept decision, then develop the material board and product specifications separately.',
        'Digital colors vary with lighting, photography, and screens. Physical sample review remains a separate step; an approved mood does not establish the final finish or authorize an order.',
      ]),
    ],
    checklist: [
      'Can each image be explained in relation to the brief?',
      'Are alternatives clearly separated from the selected direction?',
      'Are unresolved product and material decisions recorded?',
    ],
    related: ['concept-board', 'material-board', 'presentation'],
    sample: 'design',
  },
  {
    id: 'material-board',
    modified: '2026-09-15',
    slug: 'interior-design-material-board',
    title: 'How to make an interior design material board',
    cluster: 'design',
    wave: 2,
    description:
      'Connect material samples to finish references, applications, and approvals with a practical material-board guide and an illustrative palette.',
    intro:
      'A material board moves the discussion from general atmosphere toward identifiable surfaces and finishes. It should explain where each material belongs and what still needs confirmation.',
    visual: 'materials',
    sections: [
      section('purpose', 'Material board versus mood board', [
        'A mood board explores a direction. A material board brings proposed materials into relationship: floor against wall, upholstery beside timber, and hard surfaces next to soft ones. A digital board helps communicate those relationships; a physical board lets reviewers examine actual samples.',
        'Neither board replaces product information. A material may look appropriate and still need checks for application, substrate, maintenance, durability, or specialist requirements. Keep aesthetic approval separate from technical review.',
      ]),
      section('references', 'Give each sample a stable reference', [
        'Use the same reference on the board, finish schedule, and drawings. In The Window Room, FIN-01 identifies the existing oak flooring and FIN-02 identifies the proposed warm mineral wall finish. J-01 identifies the joinery concept; it is not a verified manufacturer’s product code.',
        'Label samples with the product or material name, intended application, source, and revision or sample date when known. If a product is not selected, say so. A descriptive placeholder is more honest than an invented supplier reference.',
      ]),
      section(
        'compare',
        'Review materials in context',
        [
          'Place materials beside the retained elements that cannot easily change. For this sample, that means the oak floor is the reference point rather than a disposable background. Examine physical samples in the project’s relevant lighting conditions where possible; record what conditions were used for the review.',
        ],
        [
          'Check finish combinations, not just individual favorites.',
          'Keep alternates separate and identify why they are being considered.',
          'Record differences between the actual sample and the displayed image.',
          'Request product information before assuming suitability for a surface.',
        ],
      ),
      section('handoff', 'Transfer decisions into the schedule', [
        'When a selection advances, update the finish or product specification with its source and status. A board label should lead to an identifiable record, not a dead end. Keep outstanding quantities and preparation questions visible.',
        'The illustrative wall finish has no measured area. Do not infer a purchase quantity from the room’s 20 m² floor footprint. The board establishes a visual relationship; survey and product-specific planning establish what a real project requires.',
      ]),
    ],
    checklist: [
      'Does every sample have a reference and application?',
      'Can someone distinguish selected, alternative, and unverified materials?',
      'Have physical review and technical suitability been treated as separate tasks?',
    ],
    related: ['mood-board', 'finish-schedule', 'spec-sheet'],
    sample: 'materials',
  },
  {
    id: 'concept-board',
    modified: '2026-09-15',
    slug: 'interior-design-concept-board',
    title: 'Interior design concept boards: from brief to direction',
    cluster: 'design',
    wave: 2,
    description:
      'Develop a concept board that explains your design idea, distinguishes mood from materials, and makes client review more focused.',
    intro:
      'A concept board gives the design a point of view. It connects an idea to the way the room will be used, rather than asking attractive images to explain the project on their own.',
    visual: 'concept',
    sections: [
      section('idea', 'Write the idea before choosing the images', [
        'Start with the brief: who uses the space, what they need to do, and what must remain. Then write one sentence explaining the proposed response. For The Window Room, the idea is to connect reading, gathering, and storage while allowing the existing light and floor to lead.',
        'The board should make that statement understandable. Include only the references needed to explain the proposed relationships: a layout sketch for activity, a room study for atmosphere, and material notes for continuity.',
      ]),
      section('distinctions', 'Concept, mood, and material boards have different jobs', [
        'Practices use these names differently, so state the purpose of the document you are presenting. In this library, a concept board explains the organizing idea; a mood board explores atmosphere; a material board identifies proposed surfaces and finishes.',
        'One presentation can contain all three, but their review questions should remain distinct. Agreement that a room should feel calm is not confirmation of a particular fabric, joinery construction, or supplier.',
      ]),
      section(
        'example',
        'A concept structure for The Window Room',
        [
          'The sample keeps the openings and existing oak floor. Reading is associated with the window corner, conversation with the seating group, and storage with J-01. Quiet Oak supplies the selected material direction; the plan and elevation make parts of that intent readable.',
          'This is an illustrative design narrative, not a validated space plan. Its purpose is to demonstrate how a broad aim can connect to specific references while uncertainties remain explicit.',
        ],
        [
          'Brief: combine reading, conversation, and storage.',
          'Constraint: retain floor and opening positions.',
          'Response: relate furniture and storage to the room’s existing qualities.',
          'Review: confirm the direction before developing verified project details.',
        ],
      ),
      section('feedback', 'Ask for feedback at the right level', [
        'Invite the client to respond to the proposed idea and priorities first. If the discussion jumps to a specific product, record it without letting an unverified choice quietly become the concept’s foundation.',
        'Finish the review with a short decision note: what is selected, what needs another study, and what information is required next. Use the presentation storyboard to keep that request visible.',
      ]),
    ],
    checklist: [
      'Does the board explain one clear idea?',
      'Is that idea connected to needs and constraints?',
      'Are the next decisions and unresolved details explicit?',
    ],
    related: ['design-brief', 'mood-board', 'presentation'],
    sample: 'design',
  },
  {
    id: 'space-planning',
    modified: '2026-09-15',
    slug: 'interior-design-space-planning',
    title: 'Interior design space planning: a practical workflow',
    cluster: 'design',
    wave: 1,
    description:
      'Work through room uses, fixed constraints, furniture relationships, and circulation with an annotated illustrative floor plan and review checklist.',
    intro:
      'Space planning translates activities into relationships inside a room. Begin with what people need to do and the conditions that must remain, then test a layout before committing to individual products.',
    visual: 'plan',
    sections: [
      section('inputs', 'Start with trustworthy inputs', [
        'Collect the brief, a measured room record, retained furniture dimensions, and known constraints. Record uncertainty rather than drawing around guessed dimensions. A precise-looking plan based on an unverified opening position can still mislead the next person.',
        'The Window Room is a nominal 5000 × 4000 mm study with a 2800 mm ceiling. These dimensions explain the example; they are not a measured site record. Keep that distinction when adapting its workflow.',
      ]),
      section('zones', 'Map activities before objects', [
        'List activities and their relationships: which should connect, which need separation, and which compete for the same area. In this sample, reading relates to the window corner, conversation to F-01 and F-02, and storage to the west-wall J-01 concept.',
        'Use simple zones before detailed furniture. A zone identifies an intended use, not a guaranteed clearance. Test the actual furniture envelope, operation, and access needs when verified dimensions are available.',
      ]),
      section(
        'test',
        'Check movement and operation',
        [
          'Trace routes between the entrance and each activity. Examine door operation, furniture use, access to storage, and the effect of people using the room at the same time. Draw the operating condition as well as the tidy presentation condition.',
        ],
        [
          'Check retained openings against the survey.',
          'Use the selected product’s dimensions, not a visually similar symbol.',
          'Record pinch points and unresolved access needs.',
          'Refer project-specific accessibility, egress, and technical requirements to the appropriate professionals; this guide sets no universal minimum clearances.',
        ],
      ),
      section('coordinate', 'Coordinate the plan with other records', [
        'Every significant selection should have a reference that leads somewhere: F-01 to its specification, J-01 to its elevation, and FIN-01 to the finish record. Compare these records when a selection changes.',
        'WR-01 illustrates the relationships, while WR-02 studies the joinery. Neither is construction-ready. The useful lesson is the connection between documents, not an invitation to scale the illustration or build from it.',
      ]),
    ],
    checklist: [
      'Are dimensions sourced and uncertainties marked?',
      'Have movement, use, and operation been considered?',
      'Do product and drawing references agree across the package?',
    ],
    related: ['measure-room', 'room-data', 'ffe-schedule'],
    sample: 'drawings',
  },
  {
    id: 'measure-room',
    modified: '2026-09-15',
    slug: 'how-to-measure-a-room',
    title: 'How to measure a room for interior design',
    cluster: 'discover',
    wave: 2,
    description:
      'Record room dimensions, openings, diagonals, and photo references clearly, with a practical measurement workflow and editable survey checklist.',
    intro:
      'The goal of measuring a room is not simply to collect numbers. It is to produce a record that another person can interpret, check, and use without guessing where a dimension begins or ends.',
    visual: 'measure',
    sources: [leica],
    sections: [
      section('prepare', 'Prepare the record and access arrangements', [
        'Assign a room reference and sketch the outline before adding dimensions. State the unit once on the sheet and repeat it where ambiguity is possible. Check instrument setup and follow its manufacturer’s instructions, including the measurement reference point.',
        'Arrange permission and safe access before the visit. This is a documentation workflow, not a substitute for surveying training, site safety procedures, or specialist inspection. Do not disturb finishes or concealed services to complete a checklist.',
      ]),
      section('record', 'Record geometry and openings systematically', [
        'Work around the room in a consistent direction. Record individual wall runs and locate openings relative to identified corners. Add relevant opening widths, heights, sill positions, and operation where they affect the brief. Note changes in ceiling height and visible obstructions.',
        'Use a dimensioned sketch and a photograph register together. A photograph helps explain context, but it does not replace a measurement. Label inaccessible positions and uncertain readings so they cannot be mistaken for verified facts.',
      ]),
      section('verify', 'Use checks rather than assumptions', [
        'Compare overall dimensions with component runs and investigate differences. Where practical, diagonals provide an additional geometric check; Leica describes their role in confirming room geometry. Do not assume a room is rectangular merely because the sketch looks rectangular.',
        'If measurements conflict, retain the observation and recheck the reference points. Do not average incompatible readings into a deceptively precise drawing. State any access or instrument limitation that affects confidence.',
      ]),
      section(
        'example',
        'Understand the sample calculation',
        [
          'The Window Room’s nominal footprint is 5000 mm × 4000 mm: 5 m × 4 m = 20 m². This is a floor footprint only. It is not the area of the walls or a material order quantity, and the sample has no verified diagonals or opening survey.',
          'Keep primary dimensions in one system. If an imperial reference is needed, label the conversion and its rounding. For example, 5000 mm is approximately 16.40 ft; that display conversion does not increase the accuracy of the original measurement.',
        ],
        [
          'Record the source of every dimension used in a deliverable.',
          'Keep unknown dimensions visibly unresolved.',
          'Transfer confirmed information into the room data sheet.',
          'Arrange further survey before fabrication or construction use.',
        ],
      ),
    ],
    checklist: [
      'Are units and measurement reference points clear?',
      'Are openings, obstructions, and missing readings recorded?',
      'Have conflicting dimensions been checked rather than hidden?',
    ],
    related: ['site-survey', 'room-data', 'space-planning'],
    sample: 'brief',
  },
  {
    id: 'design-process',
    modified: '2026-09-15',
    slug: 'interior-design-process',
    title: 'The interior design process, from brief to handoff',
    cluster: 'discover',
    wave: 2,
    description:
      'Understand interior design phases through their inputs, deliverables, review decisions, and a connected set of editable professional resources.',
    intro:
      'Think of a design process as a sequence of information and decisions, not a fixed calendar. Each phase should make something clearer and leave the next person with a usable record.',
    visual: 'process',
    sources: [aia],
    sections: [
      section('discovery', 'Discovery: establish the problem', [
        'Begin with the client’s needs, project constraints, and available information. Use the questionnaire to gather perspectives, the survey checklist to identify site information, and the brief to record agreed priorities. Keep conflicting needs and missing data visible.',
        'The output is not a finished design. It is a working brief with a defined scope, known information, and follow-up actions. Review it before investing effort in a direction the client has not understood.',
      ]),
      section('concept', 'Concept: test a direction', [
        'Develop a spatial and visual response to the brief. Explain why it serves the intended activities rather than presenting unrelated inspiration. Compare alternatives using the same constraints and record the selected direction.',
        'In the sample, Quiet Oak and Deep Olive are alternatives for the same room. Quiet Oak continues downstream. That selection is a narrative device showing how a decision should remain consistent through later documents.',
      ]),
      section('development', 'Development: make information specific', [
        'Move from atmosphere toward dimensions, material applications, product references, and coordination questions. Drawings and schedules should describe the same decisions. Product substitutions or changed dimensions need an impact review rather than a silent update.',
        'Architectural practice commonly distinguishes schematic design, design development, and construction documents; AIA describes those broad service phases. A residential interior engagement may group or exclude activities depending on the agreement. The resource sequence here is an adaptable teaching workflow, not a mandated service scope.',
      ]),
      section('handoff', 'Handoff: issue a clear package', [
        'Prepare an index identifying document names, revisions, intended use, and recipients. Include unresolved items and responsibilities. A handoff is not complete because files were sent; the recipient must be able to tell which files are current and what they may be used for.',
        'The Window Room ends in an illustrative handoff, not procurement, installation, or a completed building. A real project may continue through those activities with additional agreements and specialist responsibilities. Use the timeline to make that boundary explicit.',
      ]),
    ],
    checklist: [
      'Does each phase have an input, output, and review?',
      'Is scope defined separately from a generic process?',
      'Can the recipient identify the current issue and outstanding actions?',
    ],
    related: ['design-brief', 'timeline', 'drawing-checklist'],
    sample: 'handoff',
  },
  {
    id: 'procurement',
    modified: '2026-09-15',
    slug: 'interior-design-procurement',
    title: 'Interior design procurement: a coordination guide',
    cluster: 'coordinate',
    wave: 3,
    description:
      'Follow selections from approval through supplier confirmation, ordering, delivery, substitutions, and receiving records without losing the design references.',
    intro:
      'Procurement connects a selected design item to a real supply and delivery process. A beautiful specification is only one input: responsibility, approval, current supplier information, and receiving arrangements also matter.',
    visual: 'procurement',
    sections: [
      section('ready', 'Establish whether the item is ready', [
        'Before discussing an order, confirm the product identity, relevant dimensions, finish, quantity, and current approval record. Check that the item still fits the project information and that purchasing responsibility has been agreed.',
        'The sample sofa F-01 has no final model or supplier. It belongs in an illustrative schedule but is not ready to order. Labeling that gap is more useful than inventing a product code to complete the row.',
      ]),
      section('supplier', 'Confirm information with the supplier', [
        'Obtain current product and quote information directly from the supplier. Record what the quote includes, availability or stated lead time, delivery arrangements, and unresolved questions. An old quote or a website image is not confirmation that a selection remains available.',
        'Keep the source and date with the record. Discuss any project-specific commercial terms with the responsible purchasing party; this guide does not define payment, tax, warranty, or contractual obligations.',
      ]),
      section(
        'changes',
        'Treat substitutions as design changes',
        [
          'If a product is unavailable, compare the proposed substitute against the original requirement rather than matching appearance alone. Dimensions, finish, use, coordination, price, and timing may all change.',
          'Record the reason, affected references, reviewer, and decision before updating the schedule. Keep the original item’s status visible so an outdated specification cannot accidentally be used for ordering.',
        ],
        [
          'Identify the item and current revision.',
          'Record the proposed replacement and supporting supplier information.',
          'Review affected drawings, budget, and timeline.',
          'Update the coordinated issue only after the relevant decision.',
        ],
      ),
      section('receiving', 'Close the loop at delivery', [
        'Agree who receives the item and how receipt will be documented. Compare the delivery with the order record and document visible discrepancies or damage through the responsible party’s agreed process. Keep order confirmation and receipt as separate statuses.',
        'The sample has no orders or deliveries. Its linked workbook is a starting register, not a live inventory system or evidence that procurement has taken place.',
      ]),
    ],
    checklist: [
      'Is the product fully identified and reviewed?',
      'Are quote information and purchasing responsibility current?',
      'Are substitutions and receipt records connected to the original item reference?',
    ],
    related: ['ffe-schedule', 'spec-sheet', 'budget'],
    sample: 'materials',
  },
  {
    id: 'elevation-guide',
    modified: '2026-09-15',
    slug: 'interior-elevation-drawings',
    title: 'How to read interior elevation drawings',
    cluster: 'coordinate',
    wave: 3,
    description:
      'Read an illustrative joinery elevation through its view reference, dimensions, material notes, and relationship to the plan and specification.',
    intro:
      'An interior elevation describes a vertical face of a room or element. Read it alongside the plan and related specification rather than asking one view to explain an entire assembly.',
    visual: 'elevation',
    sections: [
      section('locate', 'Locate the view before reading the detail', [
        'Start with the drawing title, reference, orientation, and revision. Identify which wall or element is being shown and connect it to the plan. An elevation of the wrong wall can look plausible if its location is not clear.',
        'WR-02 is the sample west-wall J-01 joinery elevation. WR-01 locates the joinery in the room. The pair demonstrates a reference relationship; it is not a complete construction drawing set.',
      ]),
      section('dimensions', 'Read stated dimensions; do not scale the image', [
        'The sample shows three nominal 800 mm modules across a 2400 mm joinery width and a 675 mm base height. These are authored sample dimensions, not site measurements or fabrication instructions. The diagram’s on-screen scale changes with display size.',
        'A width and height do not define construction. Depth, substrate, tolerances, fixings, junctions, and specialist requirements may need separate information. Do not infer missing details from a rendered room image.',
      ]),
      section(
        'materials',
        'Follow references to the material information',
        [
          'J-01 identifies the pale oak joinery concept. A material note explains intent, but a real project needs a developed specification and appropriate review. Keep proposed finishes distinguishable from confirmed products.',
          'If the concept changes, review the plan, elevation, and specification together. A consistent reference is useful only while the records behind it still agree.',
        ],
        [
          'Check title, orientation, revision, and intended use.',
          'Read units and identify missing dimensions.',
          'Follow material and component references.',
          'Record unresolved interfaces before issuing the next version.',
        ],
      ),
      section('limits', 'Know what this example cannot establish', [
        'The published elevation remains R0, illustrative, and pending review. It does not establish structural adequacy, safe fixings, fabrication tolerances, or compliance. A qualified project team must develop and verify that information for a real installation.',
        'Use the drawing checklist to record unresolved questions instead of adding confident-looking but unsupported construction notes. The checklist supports review; it does not certify the drawing.',
      ]),
    ],
    checklist: [
      'Can the view be located on the plan?',
      'Are dimensions and unknowns explicit?',
      'Do material references and revision status match the rest of the issue?',
    ],
    related: ['drawing-checklist', 'spec-sheet', 'space-planning'],
    sample: 'drawings',
  },
  {
    id: 'rcp-guide',
    modified: '2026-09-15',
    slug: 'reflected-ceiling-plan',
    title: 'What is a reflected ceiling plan?',
    cluster: 'coordinate',
    wave: 3,
    description:
      'Learn how to read a reflected ceiling plan, its orientation and legend, and the coordination questions it raises through an illustrative teaching diagram.',
    intro:
      'A reflected ceiling plan, or RCP, communicates information at the ceiling. It is a distinct view with its own legend and coordination needs, not simply a furnished floor plan with a few lighting symbols added.',
    visual: 'rcp',
    sources: [bricsys],
    sections: [
      section('orientation', 'Understand the reflected view', [
        'Bricsys describes reflected ceiling plans as mirror images of the ceiling, useful for showing ceiling installations. That reflected convention helps the ceiling information relate to the plan below. Read the drawing orientation and view title instead of rotating or mirroring it by guesswork.',
        'The teaching diagram on this page is newly authored for the library. It uses the sample room’s nominal footprint, but it is not an existing Window Room deliverable, a measured ceiling survey, or an application export.',
      ]),
      section('legend', 'Read the legend and heights', [
        'Identify what each symbol means within that particular drawing. A circle or rectangle is not enough to establish a fixture type, performance, or installation requirement. Look for a schedule reference, ceiling description, and height datum where those are supplied.',
        'Our diagram deliberately marks a notional lighting position and a coordination zone without specifying products or installation locations. The 2800 mm height comes from the illustrative project fixture and remains unverified.',
      ]),
      section(
        'coordination',
        'Ask which other disciplines are affected',
        [
          'Ceiling information may need coordination with architecture, lighting, mechanical services, fire protection, structure, and access requirements, depending on the project. Record interfaces and request the responsible professional’s information rather than inventing a complete solution.',
          'A proposed visual alignment does not prove that a fitting can be installed there. Keep aesthetic intent, technical design, and verified site conditions as separate inputs to the review.',
        ],
        [
          'Check the room outline and opening references against current plans.',
          'Identify ceiling changes and any missing height information.',
          'Review each symbol against its legend and schedule.',
          'Assign unresolved services and access questions to the appropriate project team.',
        ],
      ),
      section('issue', 'Issue with an explicit purpose', [
        'Label a ceiling concept as a concept. A coordinated construction issue requires more information and review than this introductory guide provides. Do not copy notional symbols or positions into an installation instruction.',
        'The linked drawing checklist helps record missing information, current revisions, and intended recipients. It does not establish electrical design, fixture spacing, fire safety, or regulatory compliance.',
      ]),
    ],
    checklist: [
      'Is the view orientation and legend understandable?',
      'Are heights, symbols, and unresolved interfaces clearly identified?',
      'Is the issue status appropriate to the information actually provided?',
    ],
    related: ['drawing-checklist', 'elevation-guide', 'room-data'],
    sample: 'drawings',
  },
  {
    id: 'ffe-guide',
    modified: '2026-09-15',
    slug: 'ffe-in-interior-design',
    title: 'What does FF&E mean in interior design?',
    cluster: 'coordinate',
    wave: 3,
    description:
      'Understand furniture, fixtures, and equipment in an interior design workflow, including schedule boundaries, product specifications, and procurement status.',
    intro:
      'FF&E stands for furniture, fixtures, and equipment. In a design workflow, the term often identifies a group of selections that need to be specified, counted, reviewed, and coordinated for a project.',
    visual: 'ffe',
    sections: [
      section('boundary', 'Define the boundary for your project', [
        'The exact boundary varies with the practice, project, and agreement. Do not assume that a familiar acronym settles who specifies, purchases, or installs every item. Agree a classification and responsibilities before assembling the register.',
        'This library uses the FF&E schedule for the sofa F-01, reading chair F-02, and loose rug T-01. Retained flooring FIN-01 belongs in the finish schedule; built-in J-01 joinery is developed through its drawing and specification. This is an explicit teaching convention, not a universal legal or accounting definition.',
      ]),
      section('records', 'A schedule and a specification answer different questions', [
        'The schedule answers where an item belongs and how many are proposed. The product specification answers what the item is: identity, size, finish, source, and review status. A stable reference links the two.',
        'Avoid repeating uncertain product information in several places without a clear source. If a model changes, update the specification and review its impact on quantities, layout, budget, and timing.',
      ]),
      section(
        'example',
        'Read one item across the sample',
        [
          'F-01 is an illustrative linen two-seat sofa in the conversation area. Its proposed quantity is one. The final model and supplier are not specified, so the schedule says pending review and not ordered.',
          'The image helps communicate intent, but it does not supply verified dimensions, a quotation, or approval. This is why a complete-looking board must not be mistaken for an order-ready package.',
        ],
        [
          'Plan reference: F-01.',
          'Register: one proposed item in The Window Room.',
          'Specification gap: final model, dimensions, and supplier.',
          'Purchasing state: not ordered; further review required.',
        ],
      ),
      section('handoff', 'Keep the reference through procurement', [
        'Once real project information is developed, the reference can connect selection review, supplier confirmation, order records, delivery, and receiving notes. Each is a different state and may have a different responsible party.',
        'For accounting classifications, depreciation, insurance, tax, or contractual definitions, obtain appropriate professional advice. This guide addresses design-document coordination only.',
      ]),
    ],
    checklist: [
      'Is the project’s FF&E boundary documented?',
      'Do schedule items link to current product information?',
      'Are selection approval and purchasing status separate?',
    ],
    related: ['ffe-schedule', 'spec-sheet', 'procurement'],
    sample: 'materials',
  },
  {
    id: 'project-management',
    modified: '2026-09-15',
    slug: 'interior-design-project-management',
    title: 'Interior design project management: decisions and handoffs',
    cluster: 'handoff',
    wave: 3,
    description:
      'Organize interior design responsibilities, approvals, revisions, and handoffs with a practical decision-management workflow and editable timeline.',
    intro:
      'A design project can have a full task list and still be stalled by one unanswered question. Manage decisions and information handoffs as deliberately as you manage production tasks.',
    visual: 'decisions',
    sections: [
      section('ownership', 'Give each decision an owner', [
        'Describe the decision in plain language, identify who provides the information, and identify who can make or confirm it. A broad task such as “finish selections” becomes more actionable when split into a specific choice and its prerequisites.',
        'In the sample, the final F-01 sofa model remains unresolved. That is not merely a missing cell: dimensions, layout checks, supplier information, and budget discussion may depend on it. A real project needs an assigned owner and review date.',
      ]),
      section('status', 'Separate review states', [
        'Proposed, under review, selected, technically coordinated, and ordered are not synonyms. Use status labels that match the record’s purpose and avoid a single “done” checkbox that hides the remaining work.',
        'Quiet Oak is the selected illustrative concept, but the drawings still say pending review and the furniture has not been ordered. Those statements are compatible because they describe different decisions.',
      ]),
      section(
        'change',
        'Keep a usable revision trail',
        [
          'When a decision changes, record what changed, why, who reviewed it, and which documents are affected. Preserve the previous issue in your project system and make the current issue easy to identify.',
          'Do not rename a file “final” and rely on that word forever. A dated or numbered issue register with an explicit purpose is easier to interpret, especially when drawings, schedules, and presentations move at different speeds.',
        ],
        [
          'Decision or change request.',
          'Required information and owner.',
          'Affected drawings, schedule rows, budget, and timeline.',
          'Review outcome and current issue reference.',
        ],
      ),
      section('handoff', 'Make the next action obvious', [
        'A handoff note should identify the package, its intended use, and outstanding actions. Ask whether the recipient has enough information for the next agreed task, not merely whether they received the files.',
        'OpenLintel’s public sample demonstrates a connected narrative; it is not a live project-management service or evidence of actual client approvals. The downloadable timeline and scope outline can help structure your own records without implying a hosted workflow.',
      ]),
    ],
    checklist: [
      'Does every unresolved decision have an owner?',
      'Do statuses describe the right kind of approval?',
      'Can the next recipient identify the current issue and required action?',
    ],
    related: ['timeline', 'scope-of-work', 'presentation'],
    sample: 'handoff',
  },
  {
    id: 'drawing-checklist',
    modified: '2026-09-15',
    slug: 'interior-design-drawing-checklist',
    title: 'Interior design drawing package checklist',
    cluster: 'handoff',
    wave: 3,
    description:
      'Review drawing references, units, revisions, schedules, and outstanding coordination questions with a practical interior design issue checklist.',
    intro:
      'A drawing-package review checks whether the documents tell a consistent story and whether their intended use is clear. This checklist supports that review; it does not certify technical adequacy or construction readiness.',
    visual: 'drawing-index',
    sections: [
      section('index', 'Start with the issue register', [
        'List every document in the package with its reference, title, revision, date, and intended use. Identify the responsible reviewer and recipients for a real issue. Confirm that superseded files cannot be confused with current files.',
        'The Window Room has WR-01, a furnished plan, and WR-02, a joinery elevation. Both remain R0 illustrative samples. The teaching RCP on this library’s separate guide is not part of that original two-drawing package.',
      ]),
      section(
        'geometry',
        'Check the information behind the drawing',
        [
          'Review units, dimension sources, room references, and orientation. Compare overall and component dimensions where appropriate. Mark unresolved site information rather than presenting nominal geometry as verified.',
          'Check that the selected furniture dimensions are actually available before relying on a drawn footprint. Identify missing depths, opening information, or interfaces that require further development.',
        ],
        [
          'Title, reference, revision, and issue purpose are visible.',
          'Dimensions have units and an identifiable source.',
          'View references point to the intended sheet or detail.',
          'Unverified and inaccessible conditions are recorded.',
        ],
      ),
      section(
        'coordination',
        'Follow each reference across the package',
        [
          'Trace product and material references from plan to schedule and specification. If J-01 changes, ask whether WR-02 and the material record still describe the same concept. If a product is replaced, identify the affected layout and budget records.',
          'Review labels and legends as information, not decoration. A symbol that is understandable only to its author needs clarification before another person relies on it.',
        ],
        [
          'No unexplained item IDs or broken drawing references.',
          'Selected concept consistent across downstream artifacts.',
          'Quantities reconciled with the intended room register.',
          'Missing specialist information assigned for follow-up.',
        ],
      ),
      section('release', 'Record the review outcome', [
        'Separate corrections completed from issues still open. State who must resolve each outstanding item and whether it prevents the next intended use. Keep the package at the appropriate status until that review is complete.',
        'For construction, fabrication, permits, or regulated work, the relevant qualified professionals must develop and review the documentation. An editorial checklist and illustrative drawings do not replace that responsibility.',
      ]),
    ],
    checklist: [
      'Is the package indexed and current?',
      'Are sources, references, and unresolved items traceable?',
      'Is the intended use limited to what has actually been reviewed?',
    ],
    related: ['elevation-guide', 'rcp-guide', 'site-survey'],
    sample: 'handoff',
  },
]
  .map(enrichExistingGuide)
  .concat(workflowGuides)
  .map((item) => ({
    ...item,
    kind: 'guide',
    path: `resources/${item.slug}/`,
    status: 'published',
    modified: item.modified,
    sources: item.sources || [],
  }));
