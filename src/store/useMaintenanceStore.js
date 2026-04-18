import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useMaintenanceStore = create((set, get) => ({
  records: {}, // keyed by laptop_id

  fetchForLaptop: async (laptopId) => {
    const { data, error } = await supabase
      .from('laptop_maintenance')
      .select('*')
      .eq('laptop_id', laptopId)
      .order('maintenance_date', { ascending: false })
    if (error) throw error
    set((state) => ({ records: { ...state.records, [laptopId]: data } }))
    return data
  },

  addRecord: async (record) => {
    const { data, error } = await supabase
      .from('laptop_maintenance')
      .insert([record])
      .select()
      .single()
    if (error) throw error
    set((state) => ({
      records: {
        ...state.records,
        [record.laptop_id]: [data, ...(state.records[record.laptop_id] || [])]
      }
    }))
    return data
  },

  updateRecord: async (id, laptopId, updates) => {
    const { data, error } = await supabase
      .from('laptop_maintenance')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set((state) => ({
      records: {
        ...state.records,
        [laptopId]: (state.records[laptopId] || []).map(r => r.id === id ? data : r)
      }
    }))
    return data
  },
}))
