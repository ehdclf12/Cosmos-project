export default function ClubsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div
        className="w-24 h-24 rounded-2xl mb-6 flex items-center justify-center text-4xl"
        style={{ backgroundColor: '#2A2A28', color: 'white' }}
      >
        ◈
      </div>
      <h2 className="text-xl font-light mb-2" style={{ color: '#1C1C1C' }}>독서 클럽</h2>
      <p className="text-sm" style={{ color: '#A8A49C' }}>
        같은 책을 읽는 사람들과 함께하는 공간
        <br />
        곧 만나볼 수 있어요
      </p>
      <span
        className="mt-4 px-4 py-1.5 rounded-full text-xs"
        style={{ backgroundColor: '#E8E5E0', color: '#A8A49C' }}
      >
        Coming Soon
      </span>
    </div>
  )
}
