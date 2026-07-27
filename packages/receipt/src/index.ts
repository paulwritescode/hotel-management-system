import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'

// The canonical "Order Summary" document — a record of what was ordered, NOT a payment receipt or
// tax invoice. Shared by the staff console (download / print) and the Cloudflare Worker (the PDF
// WhatsApp sends the diner) so the two can never drift.
//
// Addendum 04 §3 — the document tells the diner HOW to pay; it MUST NEVER assert that they HAVE
// paid. It is generated once at order confirmation, before settlement, and carries no payment
// status, no QR/link, and none of Add. 01 §3.2's forbidden phrases. Only the payment methods the
// restaurant has configured are rendered. The order reference is the largest text on the page
// (§3.4) because it is what the diner reads aloud and staff search on.
//
// Branding assets are injected rather than fetched: the browser reads them from /public, and the
// Worker — which has no origin to fetch relative paths from — simply omits them and falls back to
// the standard PDF fonts and a text wordmark.

export type ReceiptPaymentMethod = 'cash' | 'mpesa' | 'card' | 'other'

// Payment configuration is display-only; the system never transacts against the till (§5.4).
export type ReceiptPaymentConfig = {
  acceptedPaymentMethods: ReceiptPaymentMethod[]
  mpesaTillNumber?: string
}

export type ReceiptOrderLine = {
  nameSnapshot: string
  quantity: number
  priceKesSnapshot: number
}

export type ReceiptOrder = {
  reference?: string
  tableNumber: number
  customerName: string
  totalKes: number
  placedAt: number
  servedByName?: string
  lines: ReceiptOrderLine[]
}

export type ReceiptAssets = {
  logoPng?: ArrayBuffer | Uint8Array
  monoTtf?: ArrayBuffer | Uint8Array
  monoBoldTtf?: ArrayBuffer | Uint8Array
  /**
   * `@pdf-lib/fontkit`, required only to embed the custom TTFs above. Injected by the caller rather
   * than imported here so the Worker — which uses the standard PDF fonts — keeps roughly 400 KB of
   * font-shaping code out of its bundle.
   */
  fontkit?: unknown
  /** Rendered in the footer, e.g. the restaurant's WhatsApp number. */
  contact?: string
}

const MM = 2.834645669
const WIDTH = 80 * MM
const MARGIN = 8 * MM
const INNER = WIDTH - MARGIN * 2

const RESTAURANT_NAME = 'Heavenly Foods'

const PAYMENT_METHOD_ORDER: ReceiptPaymentMethod[] = ['cash', 'mpesa', 'card', 'other']
const PAYMENT_METHOD_LABELS: Record<ReceiptPaymentMethod, string> = {
  cash: 'Cash',
  mpesa: 'M-Pesa',
  card: 'Card',
  other: 'Other',
}

export function orderReferenceShort(reference?: string): string | undefined {
  return reference?.split('-').at(-1)
}

function nairobiTimestamp(at: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(at))
}

export async function buildOrderSummaryPdf(
  order: ReceiptOrder,
  payment?: ReceiptPaymentConfig,
  assets: ReceiptAssets = {},
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  if (assets.fontkit) pdf.registerFontkit(assets.fontkit as Parameters<typeof pdf.registerFontkit>[0])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const courier = await pdf.embedFont(StandardFonts.Courier)
  // Numbers use JetBrains Mono when the caller supplies both the font bytes and fontkit, else Courier.
  const canEmbedTtf = Boolean(assets.fontkit)
  const mono = canEmbedTtf && assets.monoTtf ? await embedTtf(pdf, assets.monoTtf, courier) : courier
  const monoBold =
    canEmbedTtf && assets.monoBoldTtf ? await embedTtf(pdf, assets.monoBoldTtf, courier) : courier
  const logo = assets.logoPng ? await embedPng(pdf, assets.logoPng) : null

  // Only render the methods the restaurant has configured (§3.3). The fixed order keeps the
  // section stable regardless of how the array was stored.
  const acceptedMethods = PAYMENT_METHOD_ORDER.filter((method) =>
    (payment?.acceptedPaymentMethods ?? []).includes(method),
  )
  const height = 162 * MM + order.lines.length * 6 * MM + acceptedMethods.length * 5 * MM
  const page = pdf.addPage([WIDTH, height])
  page.drawRectangle({ x: 0, y: 0, width: WIDTH, height, color: rgb(1, 1, 1) })
  const ink = rgb(0.11, 0.11, 0.11)
  const muted = rgb(0.42, 0.42, 0.45)
  let y = height - MARGIN

  const center = (text: string, f: PDFFont, size: number, color = ink) => {
    const w = f.widthOfTextAtSize(text, size)
    page.drawText(text, { x: MARGIN + (INNER - w) / 2, y, size, font: f, color })
    y -= size + 4
  }
  const left = (text: string, f: PDFFont, size: number, color = ink) => {
    page.drawText(text, { x: MARGIN, y, size, font: f, color })
    y -= size + 4
  }
  // Left label (Helvetica), right value (value font, e.g. mono for numbers).
  const row = (label: string, value: string, valueFont: PDFFont, size: number, color = ink) => {
    page.drawText(label, { x: MARGIN, y, size, font, color: muted })
    const vw = valueFont.widthOfTextAtSize(value, size)
    page.drawText(value, { x: WIDTH - MARGIN - vw, y, size, font: valueFont, color })
    y -= size + 5
  }
  const rule = () => { page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: WIDTH - MARGIN, y: y + 4 }, thickness: 0.7, color: rgb(0.85, 0.85, 0.85) }); y -= 8 }

  if (logo) {
    const scaled = logo.scaleToFit(INNER * 0.6, 22 * MM)
    page.drawImage(logo, { x: MARGIN + (INNER - scaled.width) / 2, y: y - scaled.height, width: scaled.width, height: scaled.height })
    y -= scaled.height + 8
  } else {
    center(RESTAURANT_NAME, bold, 12)
  }

  center('Order Summary', bold, 11)
  y -= 2

  // §3.4 — the reference is promoted to the visual anchor: the largest text on the page, since it
  // is what a person reads aloud across the counter.
  const shortRef = orderReferenceShort(order.reference)
  const referenceText = order.reference ?? (shortRef ? `#${shortRef}` : null)
  if (referenceText) {
    const capW = font.widthOfTextAtSize('ORDER REFERENCE', 7)
    page.drawText('ORDER REFERENCE', { x: MARGIN + (INNER - capW) / 2, y, size: 7, font, color: muted })
    let refSize = 13
    while (refSize > 9 && monoBold.widthOfTextAtSize(referenceText, refSize) > INNER) refSize -= 0.5
    // Equal whitespace above the number (below the caption) and below it (before the rule),
    // drawn manually so the reference sits balanced rather than crowding the caption.
    const gap = 11
    y -= gap + refSize * 0.72
    const refW = monoBold.widthOfTextAtSize(referenceText, refSize)
    page.drawText(referenceText, { x: MARGIN + (INNER - refW) / 2, y, size: refSize, font: monoBold, color: ink })
    y -= gap + 4
  }
  rule()

  row('Table', String(order.tableNumber), mono, 8)
  row('Customer', order.customerName, font, 8)
  if (order.servedByName) row('Served by', order.servedByName, font, 8)
  row('Date', `${nairobiTimestamp(order.placedAt)} EAT`, mono, 8)
  rule()

  page.drawText('Item', { x: MARGIN, y, size: 8, font: bold, color: ink })
  { const rw = bold.widthOfTextAtSize('Total', 8); page.drawText('Total', { x: WIDTH - MARGIN - rw, y, size: 8, font: bold, color: ink }) }
  y -= 12
  for (const line of order.lines) {
    row(`${line.quantity} x ${line.nameSnapshot}`, `KES ${(line.priceKesSnapshot * line.quantity).toLocaleString()}`, mono, 8)
    page.drawText(`@ KES ${line.priceKesSnapshot.toLocaleString()}`, { x: MARGIN + 6, y: y + 2, size: 7, font: mono, color: muted })
    y -= 6
  }
  rule()
  row('TOTAL', `KES ${order.totalKes.toLocaleString()}`, monoBold, 11, ink)
  y -= 10

  // §3.2 — HOW TO PAY, between the total and the footer disclaimer. Tells the diner how to pay;
  // it never states that payment has occurred, and carries no status, no QR, and no link.
  if (acceptedMethods.length > 0) {
    rule()
    left('HOW TO PAY', bold, 8, ink)
    y -= 2
    left('Please pay at the counter and show this summary.', font, 7, muted)
    y -= 4
    left('We accept:', font, 7, muted)
    for (const method of acceptedMethods) {
      const label = method === 'mpesa' && payment?.mpesaTillNumber
        ? `M-Pesa Till ${payment.mpesaTillNumber}`
        : PAYMENT_METHOD_LABELS[method]
      page.drawText(label, { x: MARGIN + 8, y, size: 8, font, color: ink })
      y -= 8 + 4
    }
    y -= 2
  }

  rule()
  // Add. 01 §3.2 disclaimer, strengthened by §3.1 — present in both session languages.
  left('This is an order summary, not a payment receipt.', font, 7, muted)
  left('Please settle at the counter.', font, 7, muted)
  y -= 3
  left('Hii ni muhtasari wa oda, si risiti ya malipo.', font, 7, muted)
  left('Tafadhali lipa kwenye kaunta.', font, 7, muted)
  y -= 4
  left(RESTAURANT_NAME, font, 7, muted)
  if (assets.contact) left(assets.contact, mono, 7, muted)

  return pdf.save()
}

export function orderSummaryFilename(order: ReceiptOrder): string {
  return `${order.reference ?? `order-table-${order.tableNumber}`}.pdf`
}

async function embedPng(pdf: PDFDocument, bytes: ArrayBuffer | Uint8Array) {
  try {
    return await pdf.embedPng(bytes)
  } catch {
    return null
  }
}

async function embedTtf(pdf: PDFDocument, bytes: ArrayBuffer | Uint8Array, fallback: PDFFont) {
  try {
    return await pdf.embedFont(bytes)
  } catch {
    return fallback
  }
}
