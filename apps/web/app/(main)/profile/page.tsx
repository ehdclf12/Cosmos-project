export default function ProfilePage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-light mb-6" style={{ color: '#1C1C1C' }}>프로필</h1>
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: '#C8C5BC' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: '#1C1C1C', color: 'white' }}
          >
            ○
          </div>
          <div>
            <p className="font-medium" style={{ color: '#1C1C1C' }}>독자</p>
            <p className="text-sm mt-0.5" style={{ color: '#6B6862' }}>@username</p>
          </div>
        </div>
      </div>
    </div>
  )
}
