'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COURIERS } from '@cosmos/shared'
import { shipOrder, updateTracking } from '../actions'

interface Props {
  orderId: string
  mode: 'ship' | 'edit'
  initialCourier?: string | null
  initialTracking?: string | null
}

export default function ShipmentForm({ orderId, mode, initialCourier, initialTracking }: Props) {
  const router = useRouter()
  const [courier, setCourier] = useState(initialCourier || COURIERS[0].code)
  const [tracking, setTracking] = useState(initialTracking ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!tracking.trim()) {
      setError('송장번호를 입력해주세요.')
      return
    }
    setBusy(true)
    setError('')
    const run = mode === 'ship' ? shipOrder : updateTracking
    const r = await run(orderId, courier, tracking.trim())
    setBusy(false)
    if (r.error) {
      setError(r.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={courier}
          onChange={(e) => setCourier(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        >
          {COURIERS.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="송장번호"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
          style={{ color: '#1C1C1C' }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          {busy ? '처리 중...' : mode === 'ship' ? '발송 처리' : '송장 수정'}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: '#dc2626' }}>{error}</p>}
    </div>
  )
}
