import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type RosterShift = {
  staffName: string
  staffRole: string
  clockInAt: number
  clockOutAt?: number
}

function dateTime(value: number): string {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export async function downloadRosterPdf(shifts: RosterShift[]): Promise<void> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const margin = 36
  const width = 792
  const height = 612
  let page = pdf.addPage([width, height])
  let y = height - margin
  const newPage = () => { page = pdf.addPage([width, height]); y = height - margin }
  const text = (value: string, x: number, size = 9, strong = false) => page.drawText(value, { x, y, size, font: strong ? bold : font, color: rgb(0.12, 0.12, 0.13) })
  text('Heavenly Foods', margin, 16, true); y -= 22
  text('Staff roster and shift history', margin, 11, true); y -= 18
  text(`Exported ${dateTime(Date.now())} · ${shifts.length} shift record${shifts.length === 1 ? '' : 's'}`, margin, 8); y -= 22
  const columns = [margin, 190, 270, 495, 620]
  const headers = ['Staff', 'Role', 'Clocked in', 'Clocked out', 'Duration']
  const drawHeader = () => { page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: width - margin, y: y + 5 }, thickness: 0.7, color: rgb(0.78, 0.78, 0.79) }); headers.forEach((header, index) => text(header, columns[index]!, 8, true)); y -= 18 }
  drawHeader()
  for (const shift of shifts) {
    if (y < 45) { newPage(); drawHeader() }
    const duration = (shift.clockOutAt ?? Date.now()) - shift.clockInAt
    const durationText = `${Math.floor(duration / 3_600_000)}h ${Math.floor(duration / 60_000) % 60}m`
    text(shift.staffName.slice(0, 28), columns[0]!, 8)
    text(shift.staffRole, columns[1]!, 8)
    text(dateTime(shift.clockInAt), columns[2]!, 8)
    text(shift.clockOutAt ? dateTime(shift.clockOutAt) : 'Currently on shift', columns[3]!, 8)
    text(durationText, columns[4]!, 8)
    y -= 17
    page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: width - margin, y: y + 5 }, thickness: 0.3, color: rgb(0.9, 0.9, 0.9) })
  }
  const bytes = await pdf.save()
  const buffer = bytes.slice().buffer as ArrayBuffer
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = `heavenly-foods-roster-${new Date().toISOString().slice(0, 10)}.pdf`
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
}
