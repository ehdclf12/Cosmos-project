'use client'
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void
        width?: string | number
        height?: string | number
      }) => { embed: (el: HTMLElement) => void }
    }
  }
}

interface Props {
  zonecode: string
  baseAddress: string
  detailAddress: string
  onAddressSelect: (zonecode: string, address: string) => void
  onDetailChange: (detail: string) => void
  inputClass: string
}

export default function AddressSearchInput({
  zonecode,
  baseAddress,
  detailAddress,
  onAddressSelect,
  onDetailChange,
  inputClass,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    const SCRIPT_ID = 'kakao-postcode-sdk'

    const embed = () => {
      if (!containerRef.current) return
      new window.daum.Postcode({
        oncomplete: (data) => {
          onAddressSelect(data.zonecode, data.roadAddress || data.jibunAddress)
          setOpen(false)
          // 주소 선택 후 나머지 주소 입력창에 포커스
          setTimeout(() => detailRef.current?.focus(), 100)
        },
        width: '100%',
        height: '100%',
      }).embed(containerRef.current)
    }

    if (document.getElementById(SCRIPT_ID)) {
      embed()
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.onload = embed
    document.head.appendChild(script)
  }, [open, onAddressSelect])

  return (
    <div className="space-y-2">
      {/* 우편번호 + 주소검색 버튼 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={zonecode}
          readOnly
          placeholder="우편번호"
          className={inputClass + ' flex-1 bg-gray-50 cursor-default'}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 px-4 py-3 text-sm border transition-colors hover:bg-black hover:text-white"
          style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
        >
          주소검색
        </button>
      </div>

      {/* 기본 주소 */}
      <input
        type="text"
        value={baseAddress}
        readOnly
        placeholder="기본주소"
        className={inputClass + ' bg-gray-50 cursor-default'}
      />

      {/* 나머지 주소 */}
      <input
        ref={detailRef}
        type="text"
        value={detailAddress}
        onChange={(e) => onDetailChange(e.target.value)}
        placeholder="나머지 주소 (동/호수 등)"
        className={inputClass}
      />

      {/* 카카오 주소검색 모달 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="relative flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{ width: '560px', maxWidth: '95vw', height: '640px', maxHeight: '90vh', backgroundColor: '#fff' }}
          >
            {/* 모달 헤더 */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ backgroundColor: '#1C1C1C' }}
            >
              <span className="text-sm tracking-widest text-white">우편번호 검색</span>
              <button
                onClick={() => setOpen(false)}
                className="text-white opacity-70 hover:opacity-100 transition-opacity"
                aria-label="닫기"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 카카오 우편번호 위젯 영역 */}
            <div ref={containerRef} className="flex-1 overflow-hidden" />

            {/* 모달 푸터 */}
            <div className="shrink-0 px-6 py-4 border-t" style={{ borderColor: '#E8E5E0' }}>
              <button
                onClick={() => setOpen(false)}
                className="w-full py-2 text-sm border transition-colors hover:bg-gray-50"
                style={{ borderColor: '#E8E5E0', color: '#6B6862' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
