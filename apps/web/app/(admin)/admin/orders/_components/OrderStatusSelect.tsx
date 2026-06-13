'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OrderStatusSelect({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    setValue(next)
    const supabase = createClient()
    await supabase.from('orders').update({ status: next }).eq('id', id)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white outline-none cursor-pointer"
      style={{ color: '#1C1C1C' }}
    >
      <option value="paid">결제 완료</option>
      <option value="cancelled">취소됨</option>
    </select>
  )
}
