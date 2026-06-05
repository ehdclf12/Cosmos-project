'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-light tracking-widest" style={{ color: '#1C1C1C' }}>COSMOS</h1>
        <p className="mt-2 text-sm" style={{ color: '#A8A49C' }}>새로운 독자로 시작하기</p>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <div className="space-y-4">
          {[
            { label: '이메일', type: 'email', placeholder: 'email@example.com' },
            { label: '비밀번호 (6자 이상)', type: 'password', placeholder: '••••••••' },
            { label: '비밀번호 확인', type: 'password', placeholder: '••••••••' },
          ].map(({ label, type, placeholder }) => (
            <div key={label}>
              <label className="block text-xs mb-1.5" style={{ color: '#A8A49C' }}>{label}</label>
              <input
                type={type}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/')}
          className="w-full mt-6 py-3 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          가입하기
        </button>
      </div>

      <p className="text-center mt-6 text-sm" style={{ color: '#A8A49C' }}>
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="underline" style={{ color: '#1C1C1C' }}>로그인</Link>
      </p>
    </div>
  )
}
