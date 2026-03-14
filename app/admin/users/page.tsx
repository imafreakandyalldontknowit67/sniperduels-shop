import { getUsers } from '@/lib/storage'
import { UsersTable } from '@/components/admin/UsersTable'

export default async function UsersPage() {
  const users = (await getUsers()).sort((a, b) =>
    new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
  )

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Users</h1>
      <UsersTable initialUsers={users} />
    </div>
  )
}
