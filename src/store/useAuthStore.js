import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  loading: true,

  initialize: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      set({ user, role: roleData?.role || 'staff', loading: false })
    } else {
      set({ user: null, role: null, loading: false })
    }
  },

  setUser: (user, role) => set({ user, role, loading: false }),
  clearUser: () => set({ user: null, role: null, loading: false }),
}))
