import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { AnalyticsDashboard } from './convex'

export type AnalyticsReportType = 'full' | 'offers' | 'staff'

const money = (value: number) => `KES ${Math.round(value).toLocaleString()}`
const dateTime = (value: number) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

export async function downloadAnalyticsPdf(data: AnalyticsDashboard, type: AnalyticsReportType): Promise<void> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const margin = 42
  const width = 792
  const height = 612
  let page = pdf.addPage([width, height])
  let y = height - margin
  const ink = rgb(0.12, 0.12, 0.13)
  const muted = rgb(0.42, 0.42, 0.44)
  const text = (value: string, x = margin, size = 9, strong = false, color = ink) => page.drawText(value.slice(0, 110), { x, y, size, font: strong ? bold : font, color })
  const line = () => { page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: width - margin, y: y + 5 }, thickness: 0.45, color: rgb(0.82, 0.82, 0.83) }); y -= 14 }
  const nextPage = () => { page = pdf.addPage([width, height]); y = height - margin }
  const heading = (title: string, subtitle?: string) => { text(title, margin, 16, true); y -= 17; if (subtitle) { text(subtitle, margin, 8, false, muted); y -= 15 } }
  const row = (values: string[], columns: number[], strong = false) => { values.forEach((value, index) => text(value, columns[index] ?? margin, 8, strong)); y -= 17; page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: width - margin, y: y + 5 }, thickness: 0.25, color: rgb(0.9, 0.9, 0.9) }) }

  text('Heavenly Foods', margin, 18, true); y -= 24
  heading(type === 'offers' ? 'Offer performance report' : type === 'staff' ? 'Staff performance report' : 'Restaurant performance report', `Generated ${dateTime(Date.now())} · Last 7 days`)
  text(`Orders ${data.today.orders} today · Settled revenue ${money(data.today.revenueKes)}`, margin, 9); y -= 22

  if (type === 'full' || type === 'offers') {
    heading('Offer performance', 'Offer-tagged sales compared with regular menu sales')
    const normalOrders = Math.max(0, data.today.orders - data.offers.offerOrders)
    const normalRevenue = Math.max(0, data.today.revenueKes - data.offers.revenueKes)
    row(['Measure', 'Offer sales', 'Normal sales'], [margin, 285, 445], true)
    row(['Orders', String(data.offers.offerOrders), String(normalOrders)], [margin, 285, 445])
    row(['Units', String(data.offers.offerUnits), '—'], [margin, 285, 445])
    row(['Revenue', money(data.offers.revenueKes), money(normalRevenue)], [margin, 285, 445])
    row(['Discount given', money(data.offers.discountKes), '—'], [margin, 285, 445])
    y -= 8
    heading('Offer items', 'Units sold, current offer price, original price and revenue')
    row(['Item / offer', 'WAS', 'NOW', 'Units', 'Revenue'], [margin, 270, 350, 430, 505], true)
    for (const item of data.offers.items) {
      if (y < 54) { nextPage(); heading('Offer items (continued)'); row(['Item / offer', 'WAS', 'NOW', 'Units', 'Revenue'], [margin, 270, 350, 430, 505], true) }
      row([`${item.name} · ${item.offerLabel}`, money(item.originalPriceKes), money(item.offerPriceKes), String(item.units), money(item.revenueKes)], [margin, 270, 350, 430, 505])
    }
  }

  if (type === 'full' || type === 'staff') {
    if (y < 180) nextPage()
    y -= 12
    heading('Waiter performance', 'Service volume and assigned table coverage')
    row(['Waiter', 'Tables', 'Served', 'Median service', 'Rating'], [margin, 205, 360, 430, 560], true)
    for (const waiter of data.waiters) {
      if (y < 54) { nextPage(); heading('Waiter performance (continued)'); row(['Waiter', 'Tables', 'Served', 'Median service', 'Rating'], [margin, 205, 360, 430, 560], true) }
      row([waiter.name, waiter.tableNumbers.join(', ') || 'None', String(waiter.ordersServed), waiter.medianServeTimeMs === null ? '—' : `${Math.round(waiter.medianServeTimeMs / 60_000)} min`, waiter.ratingCount ? `${waiter.meanRating?.toFixed(1) ?? '—'} / ${waiter.ratingCount}` : '—'], [margin, 205, 360, 430, 560])
    }
    y -= 12
    heading('Table performance', 'Orders, settled revenue and median turnaround')
    row(['Table', 'Orders', 'Revenue', 'Median turn'], [margin, 180, 300, 440], true)
    for (const table of data.tables) row([String(table.tableNumber), String(table.orders), money(table.revenueKes), table.medianTurnaroundMs === null ? '—' : `${Math.round(table.medianTurnaroundMs / 60_000)} min`], [margin, 180, 300, 440])
  }

  const bytes = await pdf.save()
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = `heavenly-foods-${type}-report-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
}
