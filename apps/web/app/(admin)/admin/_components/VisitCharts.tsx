interface Props {
  todayVisitors: number
  newMembers7d: number
  hourly: number[] // 길이 24
}

export default function VisitCharts({ todayVisitors, newMembers7d, hourly }: Props) {
  const maxHourly = Math.max(...hourly, 1)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '오늘 방문자', value: todayVisitors },
          { label: '신규 회원 (7일)', value: newMembers7d },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
            <p className="text-xs mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
            <p className="text-3xl font-light" style={{ color: '#1C1C1C' }}>{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-medium mb-4" style={{ color: '#1C1C1C' }}>오늘 시간대별 방문</h2>
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#E8E5E0' }}>
          <div className="flex items-end gap-1" style={{ height: 80 }}>
            {hourly.map((count, h) => (
              <div key={h} className="flex flex-col items-center flex-1">
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${Math.round((count / maxHourly) * 100)}%`,
                    minHeight: count > 0 ? 4 : 0,
                    backgroundColor: '#1C1C1C',
                    opacity: count > 0 ? 0.8 : 0.1,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex mt-1" style={{ gap: 'calc(100% / 24 - 1px)' }}>
            {[0, 6, 12, 18, 23].map((h) => (
              <span
                key={h}
                className="text-xs"
                style={{ color: '#1C1C1C', opacity: 0.5, flex: h === 0 ? '0 0 auto' : '1', textAlign: h === 23 ? 'right' : 'left' }}
              >
                {h}시
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
