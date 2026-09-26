// Private editorial candidate. Publication is controlled by the pSEO review gates.
export function purchaseOrderDraft() {
  const fields = [
    [
      'record',
      'Planning reference',
      'Use a unique planning reference. Assign an issued PO number only in your authorized ordering system.',
    ],
    ['item', 'Item reference', 'Retain the specification and FF&E identifier across revisions.'],
    [
      'description',
      'Item description',
      'Describe the selection without inventing a manufacturer or model.',
    ],
    ['supplier', 'Supplier', 'Record the verified trading party and its contact record.'],
    [
      'model',
      'Manufacturer / model',
      'Copy the exact manufacturer and model from a checked source.',
    ],
    [
      'quote',
      'Quote reference',
      'Link the dated supplier quote, including its revision or expiry when available.',
    ],
    [
      'quoteDate',
      'Quote checked date',
      'Record an actual verification date; leave unverified dates blank.',
    ],
    ['quantity', 'Quantity', 'Enter the required quantity only after checking the specification.'],
    [
      'unit',
      'Purchasing unit',
      'Keep item, set, pack or other purchasing units explicit; verify pack contents.',
    ],
    [
      'unitPrice',
      'Quoted unit price',
      'Copy the current quoted amount. Blank means unresolved, never free.',
    ],
    [
      'currency',
      'Currency',
      'Use the quote currency consistently. Do not assume USD from the audience location.',
    ],
    ['tax', 'Tax amount', 'Record a confirmed amount and source; no tax rate is supplied.'],
    [
      'freight',
      'Freight / delivery cost',
      'Separate the quoted freight or delivery amount from product price.',
    ],
    [
      'installation',
      'Installation cost',
      'Record a sourced amount or explicitly exclude it; do not silently assume zero.',
    ],
    [
      'destination',
      'Receiving location',
      'Confirm the private receiving address and recipient in your own project record.',
    ],
    [
      'requestedDate',
      'Requested delivery date',
      'Record the project request separately from supplier confirmation.',
    ],
    [
      'confirmedDate',
      'Supplier-confirmed date',
      'Enter a date only with actual supplier confirmation and its source.',
    ],
    [
      'designApproval',
      'Design decision',
      'Record the design decision and its evidence; it is not purchasing authority.',
    ],
    [
      'authority',
      'Purchasing authority',
      'Identify the person or party authorized to order, with the scope and evidence.',
    ],
    [
      'orderStatus',
      'Order status',
      'Distinguish preparation, authorized issue, supplier acknowledgment and receipt.',
    ],
    [
      'orderEvidence',
      'Order / acknowledgment',
      'Reference the actual issued order and supplier acknowledgment when they exist.',
    ],
    ['revision', 'Revision', 'Retain superseded versions and link changes to the specification.'],
    [
      'openChecks',
      'Open checks',
      'Keep unresolved product, price, delivery and authority checks visible.',
    ],
    [
      'owner',
      'Next action / owner',
      'Name the next action and responsible person only when appointed.',
    ],
  ];
  const values = {
    record: 'PO-EX-01 - private planning exercise; not issued',
    item: 'F-01',
    description: 'Linen two-seat sofa concept from The Window Room',
    supplier: 'Unresolved; no supplier appointed',
    model: 'Unresolved; no product selected',
    quote: 'No supplier quote obtained',
    quoteDate: '',
    quantity: 1,
    unit: 'item; verify purchasing unit',
    unitPrice: '',
    currency: '',
    tax: '',
    freight: '',
    installation: '',
    destination: 'Not established',
    requestedDate: '',
    confirmedDate: '',
    designApproval: 'Illustrative concept only; pending review',
    authority: 'Not established',
    orderStatus: 'Not ordered',
    orderEvidence: 'No order or acknowledgment exists',
    revision: 'R0 - teaching exercise',
    openChecks: 'Product, quote, purchasing unit, receiving plan and authority unresolved.',
    owner: 'Obtain product and quote evidence; responsible person not appointed.',
  };
  return {
    id: 'purchase-order',
    slug: 'interior-design-purchase-order',
    path: 'templates/interior-design-purchase-order/',
    title: 'Interior design purchase order planning template',
    description:
      'Private draft workbook and PDF preview connecting selections, quotes, delivery dates and purchasing authority. Pending practitioner review.',
    kind: 'template',
    cluster: 'handoff',
    format: 'xlsx',
    status: 'draft',
    indexable: false,
    modified: '2026-09-26',
    wave: 4,
    recordLayout: true,
    publicationGates: [
      'First six templates reviewed by practitioners',
      'Discovery intake delivery and attribution verified',
      'Purchase-order wording and responsibilities reviewed',
    ],
    intro:
      'Carry a stable selection reference into a separate purchasing record, with commercial facts and authority visible.',
    use: 'Private draft planning structure. It does not issue an order, establish authority, provide contract terms or represent an OpenLintel procurement capability. Complete and review the record in your own system before any purchasing action. Leave unknown costs and dates blank and explain the missing evidence.',
    workbookDescription:
      'One workbook with Instructions, Blank Template and Worked Example sheets. Each sheet uses readable field/value record blocks. Duplicate Blank Template for each item; keep issued orders in your authorized ordering system. The PDF previews the same illustrative data.',
    exampleNotice:
      'Illustrative extension of The Window Room. PO-EX-01 is an invented teaching reference, not an issued purchase order. No supplier, quote, approval or delivery commitment exists. Pending practitioner review.',
    exampleProvenance:
      'Authored by OpenLintel with AI assistance on 2026-09-26. F-01 comes from the published fictional Window Room concept. Purchasing records are original teaching additions; no real client or supplier information is used.',
    unitsNote:
      'State quantity and purchasing unit separately. Blank monetary values and dates are unresolved. This draft makes no currency, tax-rate, product-price or delivery-time assumption.',
    columns: fields.map(([key, label, help]) => ({
      key,
      label,
      help,
      type:
        key === 'quantity'
          ? 'number'
          : ['unitPrice', 'tax', 'freight', 'installation'].includes(key)
            ? 'money'
            : 'text',
    })),
    rows: [fields.map(([key]) => values[key])],
    recordSections: [
      { title: 'Identity, product and quote', keys: fields.slice(0, 9).map(([key]) => key) },
      { title: 'Commercial inputs and delivery', keys: fields.slice(9, 17).map(([key]) => key) },
      { title: 'Decisions, order and open work', keys: fields.slice(17).map(([key]) => key) },
    ],
    steps: [
      'Check the current specification and stable item reference.',
      'Obtain product and quote evidence; record quantity, unit, currency and separate costs.',
      'Keep requested delivery and supplier-confirmed delivery distinct.',
      'Record design decisions separately from purchasing authority.',
      'Record issue, acknowledgment and receipt only when those actions actually occur.',
    ],
    mistakes: [
      'A selected concept does not authorize an order.',
      'A requested delivery date is not a supplier commitment.',
      'Unknown costs must not become zero or a complete order total.',
      'Keep payment credentials and other sensitive financial details out of this planning sheet.',
    ],
    related: ['procurement', 'ffe-schedule', 'spec-sheet', 'approval-states'],
    sources: [
      {
        title:
          'Houzz Pro: purchase-order fields and workflow (reference only; this draft is not a contract)',
        url: 'https://pro.houzz.com/pro-learn/blog/startup-guide-interior-design-how-to-make-purchase-order-with-template',
      },
    ],
    sample: 'handoff',
  };
}
