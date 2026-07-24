import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { orderReferenceShort, paymentMethodLabels, type Order, type PaymentMethod } from '@/lib/models'

// An "Order Summary" PDF — a record of what was ordered, NOT a payment receipt or tax invoice.
// Titled "Order Summary" with the mandatory settle-at-the-counter disclaimer. Branded with
// logo-2; numbers set in JetBrains Mono. Always white. 80mm-wide stock (also suits thermal).
//
// Addendum 04 §3 — the document tells the diner HOW to pay; it MUST NEVER assert that they HAVE
// paid. It is generated once at order confirmation, before settlement, and carries no payment
// status, no QR/link, and none of Add. 01 §3.2's forbidden phrases. Only the payment methods the
// restaurant has configured are rendered. The order reference is the largest text on the page
// (§3.4) because it is what the diner reads aloud and staff search on.

// Payment configuration is display-only; the system never transacts against the till (§5.4).
export type ReceiptPaymentConfig = {
  acceptedPaymentMethods: PaymentMethod[]
  mpesaTillNumber?: string
}

const MM = 2.834645669
const WIDTH = 80 * MM
const MARGIN = 8 * MM
const INNER = WIDTH - MARGIN * 2

const RESTAURANT_NAME = 'Heavenly Foods'
const CONTACT = process.env.NEXT_PUBLIC_WHATSAPP_MSISDN ?? ''

function nairobiTimestamp(at: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(at))
}

async function embedImage(pdf: PDFDocument, path: string) {
  try {
    const response = await fetch(path)
    if (!response.ok) return null
    return await pdf.embedPng(await response.arrayBuffer())
  } catch {
    return null
  }
}

async function embedTtf(pdf: PDFDocument, path: string, fallback: PDFFont) {
  try {
    const response = await fetch(path)
    if (!response.ok) return fallback
    return await pdf.embedFont(await response.arrayBuffer())
  } catch {
    return fallback
  }
}

export async function buildOrderSummaryPdf(order: Order, payment?: ReceiptPaymentConfig): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const courier = await pdf.embedFont(StandardFonts.Courier)
  // Numbers use JetBrains Mono (falls back to Courier if the file can't be fetched).
  const mono = await embedTtf(pdf, '/fonts/JetBrainsMono-Regular.ttf', courier)
  const monoBold = await embedTtf(pdf, '/fonts/JetBrainsMono-Bold.ttf', courier)
  const logo = await embedImage(pdf, '/logo-2.png')

  // Only render the methods the restaurant has configured (§3.3). The fixed order keeps the
  // section stable regardless of how the array was stored.
  const methodOrder: PaymentMethod[] = ['cash', 'mpesa', 'card', 'other']
  const acceptedMethods = methodOrder.filter((method) => (payment?.acceptedPaymentMethods ?? []).includes(method))
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
    center('ORDER REFERENCE', font, 7, muted)
    y -= 1
    center(referenceText, monoBold, 20)
  }
  y -= 2
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
        : paymentMethodLabels[method]
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
  if (CONTACT) left(CONTACT, mono, 7, muted)

  return pdf.save()
}

export async function downloadOrderSummary(order: Order, payment?: ReceiptPaymentConfig): Promise<void> {
  const bytes = await buildOrderSummaryPdf(order, payment)
  const buffer = bytes.slice().buffer as ArrayBuffer
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${order.reference ?? `order-table-${order.tableNumber}`}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
