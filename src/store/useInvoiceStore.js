import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { calculateInvoiceTotals, calculateLeaseAmount } from '../lib/gst'

export const useInvoiceStore = create((set, get) => ({
  invoices: [],
  loading: false,
  error: null,

  fetchInvoices: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers(id, name, company_name, phone, email, state, gstin, monthly_rate)
      `)
      .order('created_at', { ascending: false })
    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    // Auto-mark 'Sent' invoices older than 30 days as 'Overdue'
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const overdueIds = (data || [])
      .filter(inv =>
        inv.status === 'Sent' &&
        new Date(inv.invoice_date) < thirtyDaysAgo
      )
      .map(inv => inv.id)

    if (overdueIds.length > 0) {
      await supabase
        .from('invoices')
        .update({ status: 'Overdue' })
        .in('id', overdueIds)
      // Re-fetch to get updated statuses
      const { data: refreshed } = await supabase
        .from('invoices')
        .select(`*, customers(id, name, company_name, phone, email, state, gstin, monthly_rate)`)
        .order('created_at', { ascending: false })
      set({ invoices: refreshed || [], loading: false })
    } else {
      set({ invoices: data, loading: false })
    }
  },

  fetchInvoiceWithItems: async (id) => {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers(*),
        invoice_items(
          *,
          laptops(id, brand, model, serial_number),
          challans(id, challan_number)
        )
      `)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  generateMonthlyInvoices: async (year, month, settings) => {
    const periodStart = new Date(year, month, 1)
    const periodEnd = new Date(year, month + 1, 0)

    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('*')
    if (custError) throw custError

    const results = []

    for (const customer of customers) {
      // Find all challan_items for this customer in this period
      // Now challan_items has monthly_rate per laptop
      const { data: challanItems, error: ciError } = await supabase
        .from('challan_items')
        .select(`
          *,
          laptops(id, brand, model, serial_number),
          challans!inner(id, challan_number, customer_id, delivery_date, expected_return_date, status)
        `)
        .eq('challans.customer_id', customer.id)
        .lte('challans.delivery_date', periodEnd.toISOString().split('T')[0])

      if (ciError) throw ciError

      const billableItems = []
      for (const item of (challanItems || [])) {
        const challan = item.challans
        if (!challan) continue

        const deliveryDate = new Date(challan.delivery_date)

        const { data: returnItemData } = await supabase
          .from('return_items')
          .select(`*, return_receipts!inner(return_date, challan_id)`)
          .eq('laptop_id', item.laptop_id)
          .eq('return_receipts.challan_id', challan.id)
          .order('return_receipts.return_date', { ascending: false })
          .limit(1)

        let leaseEnd = new Date(periodEnd)
        if (returnItemData && returnItemData.length > 0) {
          const returnDate = new Date(returnItemData[0].return_receipts.return_date)
          leaseEnd = returnDate < leaseEnd ? returnDate : leaseEnd
        }

        const leaseStart = deliveryDate > periodStart ? deliveryDate : new Date(periodStart)

        if (leaseStart > periodEnd || leaseEnd < periodStart) continue

        // Use per-laptop rate from challan_items, fall back to customer monthly_rate
        const itemRate = item.monthly_rate || customer.monthly_rate || 0

        const { days, amount } = calculateLeaseAmount(
          itemRate,
          leaseStart,
          leaseEnd,
          year,
          month
        )

        if (days > 0) {
          billableItems.push({
            laptop_id: item.laptop_id,
            challan_id: challan.id,
            lease_start: leaseStart.toISOString().split('T')[0],
            lease_end: leaseEnd.toISOString().split('T')[0],
            days_leased: days,
            monthly_rate: itemRate,
            amount,
            laptops: item.laptops,
            challan_number: challan.challan_number,
          })
        }
      }

      if (billableItems.length === 0) continue

      const totals = calculateInvoiceTotals(billableItems, customer.state)

      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .like('invoice_number', `GLS/${year}-${String(month + 1).padStart(2, '0')}/%`)

      const seq = (count || 0) + 1
      const invoiceNumber = `GLS/${year}-${String(month + 1).padStart(2, '0')}/${String(seq).padStart(3, '0')}`

      const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('period_start', periodStart.toISOString().split('T')[0])
        .single()

      if (existing) {
        results.push({ customer: customer.name, status: 'skipped', reason: 'Already exists' })
        continue
      }

      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          customer_id: customer.id,
          invoice_date: new Date().toISOString().split('T')[0],
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          subtotal: totals.subtotal,
          cgst_amount: totals.cgst_amount,
          sgst_amount: totals.sgst_amount,
          igst_amount: totals.igst_amount,
          total_amount: totals.total_amount,
          status: 'Draft',
        }])
        .select()
        .single()
      if (invError) throw invError

      const items = billableItems.map((item) => ({
        invoice_id: invoice.id,
        laptop_id: item.laptop_id,
        challan_id: item.challan_id,
        lease_start: item.lease_start,
        lease_end: item.lease_end,
        days_leased: item.days_leased,
        monthly_rate: item.monthly_rate,
        amount: item.amount,
      }))
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items)
      if (itemsError) throw itemsError

      results.push({ customer: customer.name, status: 'created', invoice: invoice.invoice_number })
    }

    await get().fetchInvoices()
    return results
  },

  createInvoiceManual: async ({ invoice, items }) => {
    const { data, error } = await supabase
      .from('invoices')
      .insert([invoice])
      .select()
      .single()
    if (error) throw error

    const invItems = items.map((item) => ({ ...item, invoice_id: data.id }))
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invItems)
    if (itemsError) throw itemsError

    await get().fetchInvoices()
    return data
  },

  updateInvoiceStatus: async (id, status, paymentDate = null) => {
    const updates = { status }
    if (paymentDate) updates.payment_date = paymentDate
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set((state) => ({
      invoices: state.invoices.map((inv) => (inv.id === id ? { ...inv, ...data } : inv)),
    }))
    return data
  },

  deleteInvoice: async (id) => {
    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) throw error
    set((state) => ({ invoices: state.invoices.filter((inv) => inv.id !== id) }))
  },

  getInvoiceById: (id) => get().invoices.find((inv) => inv.id === id),
}))
