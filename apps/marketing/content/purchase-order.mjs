// Editorial draft only. Publishing requires review of the first six templates,
// a working discovery intake, and practitioner review of this artifact.
export function purchaseOrderDraft() {
  const columns = [
    ['PO reference', 'Identify this purchasing record separately from the item or quote.'],
    ['Item reference', 'Use the same stable ID as the specification and FF&E schedule.'],
    [
      'Item / supplier',
      'Identify the verified supplier and exact item; do not infer it from a concept.',
    ],
    ['Quote / source date', 'Reference the current supplier quote and the date checked.'],
    [
      'Quantity / unit',
      'Record the quantity and its explicit unit; confirm pack sizes separately.',
    ],
    ['Price / currency', 'Record the quoted unit price and currency; unknown is not zero.'],
    [
      'Other costs',
      'Record tax, freight, delivery and installation amounts separately when known.',
    ],
    ['Delivery location', 'Confirm the agreed receiving location in your private project record.'],
    [
      'Required / confirmed date',
      'Keep the requested delivery date separate from supplier confirmation.',
    ],
    [
      'Authority / order status',
      'Record who may authorize the order and whether an order was actually placed.',
    ],
    ['Revision', 'Preserve the prior issue and link changes back to the specification.'],
    ['Open checks', 'Record missing information and a responsible person when appointed.'],
  ].map(([label, help]) => ({ label, help, type: 'text' }));
  return {
    id: 'purchase-order',
    slug: 'interior-design-purchase-order',
    path: 'templates/interior-design-purchase-order/',
    title: 'Interior design purchase order planning template',
    description:
      'Draft XLSX structure for connecting approved selections, supplier information and purchasing responsibility. Pending practitioner review.',
    kind: 'template',
    cluster: 'handoff',
    format: 'xlsx',
    status: 'draft',
    indexable: false,
    modified: '2026-09-26',
    wave: 4,
    publicationGates: [
      'First six templates reviewed by practitioners',
      'Discovery intake delivery and attribution verified',
      'Purchase-order wording and responsibilities reviewed',
    ],
    intro: 'Carry stable selection references into a separate purchasing record.',
    use: 'Draft planning structure only. It does not issue an order, establish purchasing authority, supply contract terms, or confirm that OpenLintel performs procurement. Verify quantities, current quotes, currency, responsibility and supplier details in your own system.',
    columns,
    rows: [
      [
        'Not issued',
        'F-01',
        'Proposed sofa; supplier/model unresolved',
        'No supplier quote',
        '1 item; verify',
        'Unresolved',
        'Unresolved',
        'Not established',
        'Required: unresolved; confirmed: none',
        'No purchasing authority; not ordered',
        'R0',
        'Confirm product, quote, delivery and responsible person.',
      ],
    ],
    steps: [
      'Confirm the current specification and item reference.',
      'Obtain a dated supplier quote and check quantity, unit and currency.',
      'Record purchasing authority separately from design approval.',
      'Record order and delivery confirmation only when they actually occur.',
    ],
    mistakes: [
      'Do not treat a concept selection as permission to purchase.',
      'Do not convert an expected delivery date into a supplier commitment.',
      'Do not hide unresolved costs in a known subtotal.',
    ],
    related: ['procurement', 'ffe-schedule', 'spec-sheet', 'approval-states'],
    sources: [],
    sample: 'handoff',
  };
}
