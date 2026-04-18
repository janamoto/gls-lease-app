import { supabase } from './supabase'

export async function getCurrentUserRole() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  return data?.role || 'staff'
}

export async function isAdmin() {
  const role = await getCurrentUserRole()
  return role === 'admin'
}
