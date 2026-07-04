export interface Courier {
  code: string
  label: string
}

export const COURIERS: Courier[] = [
  { code: 'cjlogistics', label: 'CJ대한통운' },
  { code: 'epost', label: '우체국택배' },
  { code: 'hanjin', label: '한진택배' },
  { code: 'lotte', label: '롯데택배' },
  { code: 'logen', label: '로젠택배' },
]

const LABEL_BY_CODE = new Map(COURIERS.map((c) => [c.code, c.label]))

export function courierLabel(code: string | null): string {
  if (!code) return ''
  return LABEL_BY_CODE.get(code) ?? code
}

export function trackingUrl(courier: string | null, trackingNumber: string | null): string | null {
  if (!courier || !trackingNumber) return null
  return `https://tracker.delivery/#/kr.${courier}/${trackingNumber}`
}

export function parseShippingAddress(shipping: string | null): { zonecode: string; address: string } {
  const s = (shipping ?? '').trim()
  const m = s.match(/^\((\d+)\)\s*(.*)$/)
  if (m) return { zonecode: m[1], address: m[2].trim() }
  return { zonecode: '', address: s }
}

export type RecipientRelation = 'self' | 'other' | 'unknown'

function normName(v: string | null): string {
  return (v ?? '').trim().replace(/\s+/g, ' ')
}
function normPhone(v: string | null): string {
  return (v ?? '').replace(/\D/g, '')
}

export function classifyRecipient(args: {
  ordererName: string | null
  ordererPhone: string | null
  recipientName: string | null
  recipientPhone: string | null
}): RecipientRelation {
  const oName = normName(args.ordererName)
  const oPhone = normPhone(args.ordererPhone)
  const rName = normName(args.recipientName)
  const rPhone = normPhone(args.recipientPhone)

  const canName = oName !== '' && rName !== ''
  const canPhone = oPhone !== '' && rPhone !== ''
  if (!canName && !canPhone) return 'unknown'

  if (canName && oName !== rName) return 'other'
  if (canPhone && oPhone !== rPhone) return 'other'
  return 'self'
}
