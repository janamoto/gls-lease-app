import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useCustomerStore = create((set, get) => ({
  customers: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true })
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ customers: data, loading: false })
    }
  },

  addCustomer: async (customer) => {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single()
    if (error) throw error
    set((state) => ({ customers: [data, ...state.customers] }))
    return data
  },

  updateCustomer: async (id, updates) => {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set((state) => ({
      customers: state.customers.map((c) => (c.id === id ? data : c)),
    }))
    return data
  },

  deleteCustomer: async (id) => {
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) throw error
    set((state) => ({ customers: state.customers.filter((c) => c.id !== id) }))
  },

  getCustomerById: (id) => get().customers.find((c) => c.id === id),
}))
