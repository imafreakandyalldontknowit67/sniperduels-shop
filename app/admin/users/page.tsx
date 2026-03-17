import { getUsers } from '@/lib/storage'
import { UsersTable } from '@/components/admin/UsersTable'

export default async function UsersPage() {
  const users = (await getUsers()).sort((a, b) =>
    new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
  )

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <span className="px-3 py-1 bg-dark-700 border-[2px] border-accent text-accent text-sm font-bold uppercase">
          {users.length} total
        </span>
      </div>
      <UsersTable initialUsers={users} />
    </div>
  )
}
