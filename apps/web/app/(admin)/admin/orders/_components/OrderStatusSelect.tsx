'use client'
import { useState } from 'react'
import { updateOrderStatus } from '../actions'

const STATUS_OPTIONS = [
  { value: 'paid', label: '결제완료', disabled: false },
  { value: 'preparing', label: '상품준비중', disabled: false },
  { value: 'shipping', label: '배송중 (발송 처리로만)', disabled: true },
  { value: 'delivered', label: '배송완료', disabled: false },
  { value: 'cancelled', label: '취소됨', disabled: false },
]

export default function OrderStatusSelect({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status)
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    const prev = value
    setValue(next)
    setSaving(true)
    const result = await updateOrderStatus(id, next)
    setSaving(false)
    if (result?.error) setValue(prev)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={saving}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none cursor-pointer disabled:opacity-50"
      style={{ color: '#1C1C1C' }}
    >
      {STATUS_OPTIONS.map(({ value: v, label, disabled }) => (
        <option key={v} value={v} disabled={disabled}>{label}</option>
      ))}
    </select>
  )
}
