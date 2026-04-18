import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { UserCog, Plus, Shield, Users } from 'lucide-react'

export default function UsersPage() {
  const { user, role } = useAuthStore()
  const { toast } = useToast()
  const [userRoles, setUserRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState('staff')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchUserRoles() }, [])

  const fetchUserRoles = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setUserRoles(data || [])
    setLoading(false)
  }

  const handleAddRole = async (e) => {
    e.preventDefault()
    if (!newUserId.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert([{ user_id: newUserId.trim(), role: newRole }], { onConflict: 'user_id' })
      if (error) throw error
      toast({ title: 'User role saved' })
      setNewUserId('')
      setNewRole('staff')
      fetchUserRoles()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangeRole = async (userId, newRoleValue) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRoleValue })
        .eq('user_id', userId)
      if (error) throw error
      toast({ title: 'Role updated' })
      fetchUserRoles()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleRemoveRole = async (userId) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
      if (error) throw error
      toast({ title: 'User role removed' })
      fetchUserRoles()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Shield className="w-12 h-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Access Restricted</h2>
        <p className="text-gray-500 mt-2">Only administrators can manage user roles.</p>
        <p className="text-sm text-gray-400 mt-1">Your current role: <strong>{role || 'staff'}</strong></p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Manage roles and access for system users</p>
      </div>

      {/* Current user info */}
      <Card className="mb-6 border-indigo-200 bg-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-indigo-900">Logged in as: {user?.email}</p>
              <p className="text-sm text-indigo-700">Role: <strong>Administrator</strong></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add user role */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="w-4 h-4" /> Assign User Role
          </CardTitle>
          <CardDescription>
            Enter a user's UUID (from Supabase Authentication) and assign their role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddRole} className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>User UUID</Label>
              <Input
                value={newUserId}
                onChange={e => setNewUserId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="font-mono text-sm"
                required
              />
            </div>
            <div className="w-36 space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Assign Role'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing user roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" /> User Roles ({userRoles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : userRoles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No user roles configured yet.</p>
              <p className="text-sm text-gray-400 mt-1">Add user UUIDs above to assign roles.</p>
            </div>
          ) : (
            <div className="divide-y">
              {userRoles.map(ur => (
                <div key={ur.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-gray-700 truncate">{ur.user_id}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ur.user_id === user?.id && '(You) '}
                      Added: {new Date(ur.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="w-32">
                    <Select
                      value={ur.role}
                      onValueChange={v => handleChangeRole(ur.user_id, v)}
                      disabled={ur.user_id === user?.id}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs"
                    onClick={() => handleRemoveRole(ur.user_id)}
                    disabled={ur.user_id === user?.id}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
