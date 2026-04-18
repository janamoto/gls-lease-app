import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useChallanStore = create((set, get) => ({
  challans: [],
  loading: false,
  error: null,

  fetchChallans: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('challans')
      .select(`
        *,
        customers(id, name, company_name, phone, email, state, gstin),
        challan_items(id, laptop_id, monthly_rate, laptops(id, brand, model, serial_number, ram_gb, storage_gb, storage_type, condition))
      `)
      .order('created_at', { ascending: false })
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ challans: data, loading: false })
    }
  },

  // laptopRates: { [laptopId]: rate }
  createChallan: async ({ challan, laptopIds, laptopRates = {} }) => {
    const { data: challanData, error: challanError } = await supabase
      .from('challans')
      .insert([challan])
      .select()
      .single()
    if (challanError) throw challanError

    const items = laptopIds.map((lid) => ({
      challan_id: challanData.id,
      laptop_id: lid,
      monthly_rate: laptopRates[lid] || null,
    }))
    const { error: itemsError } = await supabase
      .from('challan_items')
      .insert(items)
    if (itemsError) throw itemsError

    const { error: laptopError } = await supabase
      .from('laptops')
      .update({ status: 'On Lease' })
      .in('id', laptopIds)
    if (laptopError) throw laptopError

    await get().fetchChallans()
    return challanData
  },

  updateChallanStatus: async (id, status) => {
    const { data, error } = await supabase
      .from('challans')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set((state) => ({
      challans: state.challans.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }))
    return data
  },

  getChallanById: (id) => get().challans.find((c) => c.id === id),

  getActiveChallans: () =>
    get().challans.filter(
      (c) => c.status === 'Active' || c.status === 'Partially Returned'
    ),
}))
