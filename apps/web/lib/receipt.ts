import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { orderReferenceShort, type Order } from '@/lib/models'

// An "Order Summary" PDF — a record of what was ordered, NOT a payment receipt or tax invoice.
// Titled "Order Summary" with the mandatory settle-at-the-counter disclaimer. Branded with
// logo-2; numbers set in JetBrains Mono. Always white. 80mm-wide stock (also suits thermal).

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

export async function buildOrderSummaryPdf(order: Order): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const courier = await pdf.embedFont(StandardFonts.Courier)
  // Numbers use JetBrains Mono (falls back to Courier if the file can't be fetched).
  const mono = await embedTtf(pdf, '/fonts/JetBrainsMono-Regular.ttf', courier)
  const monoBold = await embedTtf(pdf, '/fonts/JetBrainsMono-Bold.ttf', courier)
  const logo = await embedImage(pdf, '/logo-2.png')

  const height = 148 * MM + order.lines.length * 6 * MM
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

  center('Order Summary', bold, 13)
  y -= 4
  rule()

  const shortRef = orderReferenceShort(order.reference)
  if (order.reference) row('Reference', order.reference, mono, 8)
  else if (shortRef) row('Reference', `#${shortRef}`, mono, 8)
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
  y -= 12

  // Footer — left aligned.
  left('This is an order summary, not a payment receipt.', font, 7, muted)
  left('Please settle at the counter.', font, 7, muted)
  y -= 4
  left(RESTAURANT_NAME, font, 7, muted)
  if (CONTACT) left(CONTACT, mono, 7, muted)

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
