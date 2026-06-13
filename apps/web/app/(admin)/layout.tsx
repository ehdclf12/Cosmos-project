import AdminSidebar from './_components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F2F1EE' }}>
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
