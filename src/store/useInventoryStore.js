import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useInventoryStore = create((set, get) => ({
  laptops: [],
  loading: false,
  error: null,

  fetchLaptops: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('laptops')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ laptops: data, loading: false })
    }
  },

  addLaptop: async (laptop) => {
    const { data, error } = await supabase
      .from('laptops')
      .insert([laptop])
      .select()
      .single()
    if (error) throw error
    set((state) => ({ laptops: [data, ...state.laptops] }))
    return data
  },

  updateLaptop: async (id, updates) => {
    const { data, error } = await supabase
      .from('laptops')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set((state) => ({
      laptops: state.laptops.map((l) => (l.id === id ? data : l)),
    }))
    return data
  },

  deleteLaptop: async (id) => {
    const { error } = await supabase.from('laptops').delete().eq('id', id)
    if (error) throw error
    set((state) => ({ laptops: state.laptops.filter((l) => l.id !== id) }))
  },

  getLaptopById: (id) => get().laptops.find((l) => l.id === id),

  getAvailableLaptops: () =>
    get().laptops.filter((l) => l.status === 'Available'),
}))
