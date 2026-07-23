import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { orderReferenceShort, type Order } from '@/lib/models'

// An "Order Summary" PDF — a record of what was ordered, NOT a payment receipt or tax invoice.
// Titled "Order Summary" and carrying the mandatory settle-at-the-counter disclaimer. Branded
// with logo-2. 80mm-wide stock so it also suits a thermal printer.

const MM = 2.834645669 // points per millimetre
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

async function loadLogo(pdf: PDFDocument) {
  try {
    const response = await fetch('/logo-2.png')
    if (!response.ok) return null
    return await pdf.embedPng(await response.arrayBuffer())
  } catch {
    return null
  }
}

export async function buildOrderSummaryPdf(order: Order): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const logo = await loadLogo(pdf)

  // Height grows with the number of lines; generous fixed chrome for header/footer.
  const lineRows = order.lines.length
  const height = 150 * MM + lineRows * 6 * MM
  const page = pdf.addPage([WIDTH, height])
  const ink = rgb(0.11, 0.11, 0.11)
  const muted = rgb(0.42, 0.42, 0.45)
  let y = height - MARGIN

  const center = (text: string, f: typeof font, size: number, color = ink) => {
    const w = f.widthOfTextAtSize(text, size)
    page.drawText(text, { x: MARGIN + (INNER - w) / 2, y, size, font: f, color })
    y -= size + 4
  }
  const row = (left: string, right: string, f: typeof font, size: number, color = ink) => {
    page.drawText(left, { x: MARGIN, y, size, font: f, color })
    const rw = f.widthOfTextAtSize(right, size)
    page.drawText(right, { x: WIDTH - MARGIN - rw, y, size, font: f, color })
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

  center('Order Summary', bold, 13)
  y -= 4
  rule()

  const shortRef = orderReferenceShort(order.reference)
  if (order.reference) row('Reference', order.reference, font, 8, muted)
  else if (shortRef) row('Reference', `#${shortRef}`, font, 8, muted)
  row('Table', String(order.tableNumber), font, 8, muted)
  row('Customer', order.customerName, font, 8, muted)
  row('Date', `${nairobiTimestamp(order.placedAt)} EAT`, font, 8, muted)
  rule()

  row('Item', 'Total', bold, 8)
  y -= 2
  for (const line of order.lines) {
    row(`${line.quantity} x ${line.nameSnapshot}`, `KES ${(line.priceKesSnapshot * line.quantity).toLocaleString()}`, font, 8)
    page.drawText(`@ KES ${line.priceKesSnapshot.toLocaleString()}`, { x: MARGIN + 6, y: y + 2, size: 7, font, color: muted })
    y -= 6
  }
  rule()
  row('TOTAL', `KES ${order.totalKes.toLocaleString()}`, bold, 11)
  y -= 8

  center('This is an order summary, not a payment receipt.', font, 7, muted)
  center('Please settle at the counter.', font, 7, muted)
  y -= 6
  center(RESTAURANT_NAME, font, 7, muted)
  if (CONTACT) center(CONTACT, font, 7, muted)

  return pdf.save()
}

export async function downloadOrderSummary(order: Order): Promise<void> {
  const bytes = await buildOrderSummaryPdf(order)
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
