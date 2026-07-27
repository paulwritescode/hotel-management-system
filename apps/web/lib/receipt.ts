import fontkit from '@pdf-lib/fontkit'
import {
  buildOrderSummaryPdf as buildSharedOrderSummaryPdf,
  orderSummaryFilename,
  type ReceiptPaymentConfig,
} from '@heavenly/receipt'
import type { Order } from '@/lib/models'

// Browser-side wrapper around the shared Order Summary document. The layout, wording, and the
// Addendum 04 §3 rules all live in @heavenly/receipt so the Worker's WhatsApp PDF and this
// download render the same page. Only the branding assets differ: here they come from /public.

export type { ReceiptPaymentConfig }

const CONTACT = process.env.NEXT_PUBLIC_WHATSAPP_MSISDN ?? ''

async function fetchBytes(path: string): Promise<ArrayBuffer | undefined> {
  try {
    const response = await fetch(path)
    if (!response.ok) return undefined
    return await response.arrayBuffer()
  } catch {
    return undefined
  }
}

export async function buildOrderSummaryPdf(
  order: Order,
  payment?: ReceiptPaymentConfig,
): Promise<Uint8Array> {
  const [logoPng, monoTtf, monoBoldTtf] = await Promise.all([
    fetchBytes('/logo-2.png'),
    fetchBytes('/fonts/JetBrainsMono-Regular.ttf'),
    fetchBytes('/fonts/JetBrainsMono-Bold.ttf'),
  ])
  return buildSharedOrderSummaryPdf(order, payment, {
    fontkit,
    ...(logoPng ? { logoPng } : {}),
    ...(monoTtf ? { monoTtf } : {}),
    ...(monoBoldTtf ? { monoBoldTtf } : {}),
    ...(CONTACT ? { contact: CONTACT } : {}),
  })
}

export async function downloadOrderSummary(order: Order, payment?: ReceiptPaymentConfig): Promise<void> {
  const bytes = await buildOrderSummaryPdf(order, payment)
  const buffer = bytes.slice().buffer as ArrayBuffer
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = orderSummaryFilename(order)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
