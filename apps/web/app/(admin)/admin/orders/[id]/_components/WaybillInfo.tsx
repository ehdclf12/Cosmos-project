'use client'
import { useState } from 'react'
import { parseShippingAddress } from '@cosmos/shared'

interface Props {
  recipientName: string | null
  recipientPhone: string | null
  shippingAddress: string | null
  items: { title: string; quantity: number }[]
  orderNo: string
  isOther: boolean
}

export default function WaybillInfo({ recipientName, recipientPhone, shippingAddress, items, orderNo, isOther }: Props) {
  const { zonecode, address } = parseShippingAddress(shippingAddress)
  const itemsText = items.map((i) => `${i.title} x${i.quantity}`).join(', ')

  const fields: { label: string; value: string }[] = [
    { label: '받는분', value: recipientName ?? '' },
    { label: '연락처', value: recipientPhone ?? '' },
    { label: '우편번호', value: zonecode },
    { label: '주소', value: address },
    { label: '품목', value: itemsText },
    { label: '주문번호', value: orderNo },
  ]

  const [copied, setCopied] = useState<string | null>(null)

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200)
    } catch {
      alert('복사에 실패했습니다. 직접 선택해 복사해주세요.')
    }
  }

  const allText = fields.map((f) => `${f.label}: ${f.value}`).join('\n')

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium" style={{ color: '#1C1C1C' }}>송장용 정보</h2>
        <button
          type="button"
          onClick={() => copy('__all__', allText)}
          className="text-xs px-3 py-1 rounded-lg border"
          style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
        >
          {copied === '__all__' ? '복사됨 ✓' : '전체 복사'}
        </button>
      </div>

      {isOther && (
        <p className="text-xs mb-3 px-2 py-1.5 rounded" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
          받는분이 주문자와 다릅니다 · 송장은 받는분(수령인) 기준으로 작성하세요.
        </p>
      )}

      <div className="space-y-1.5">
        {fields.map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <span className="text-xs w-16 shrink-0" style={{ color: '#6B6862' }}>{f.label}</span>
            <span className="text-sm flex-1 break-all" style={{ color: '#1C1C1C' }}>{f.value || '-'}</span>
            <button
              type="button"
              onClick={() => copy(f.label, f.value)}
              className="text-xs px-2 py-0.5 rounded shrink-0"
              style={{ backgroundColor: '#F2F1EE', color: '#6B6862' }}
            >
              {copied === f.label ? '✓' : '복사'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
