import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useChallanStore } from '@/store/useChallanStore'
import { useInventoryStore } from '@/store/useInventoryStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'
import { Plus, Search, RotateCcw } from 'lucide-react'

const CONDITIONS = ['Good', 'Damaged', 'Missing accessories']

export default function Returns() {
  const { challans, fetchChallans } = useChallanStore()
  const { fetchLaptops } = useInventoryStore()
  const { toast } = useToast()

  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedChallanId, setSelectedChallanId] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedItems, setSelectedItems] = useState({}) // laptopId -> { selected, condition, notes }
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchChallans()
    fetchReceipts()
  }, [])

  const fetchReceipts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('return_receipts')
      .select(`
        *,
        challans(challan_number, customers(name, company_name)),
        return_items(
          id, laptop_id, condition, notes,
          laptops(brand, model, serial_number)
        )
      `)
      .order('created_at', { ascending: false })
    if (!error) setReceipts(data || [])
    setLoading(false)
  }

  const activeChallans = challans.filter(c =>
    c.status === 'Active' || c.status === 'Partially Returned'
  )

  const selectedChallan = challans.find(c => c.id === selectedChallanId)

  // Get laptops not yet returned from this challan
  const [returnedLaptopIds, setReturnedLaptopIds] = useState([])

  useEffect(() => {
    if (!selectedChallanId) return
    // Fetch which laptops have already been returned from this challan
    const fetchReturned = async () => {
      const { data } = await supabase
        .from('return_items')
        .select('laptop_id, return_receipts!inner(challan_id)')
        .eq('return_receipts.challan_id', selectedChallanId)
      setReturnedLaptopIds((data || []).map(d => d.laptop_id))
    }
    fetchReturned()
  }, [selectedChallanId])

  const unreturnedItems = selectedChallan?.challan_items?.filter(
    item => !returnedLaptopIds.includes(item.laptop_id)
  ) || []

  const toggleItem = (laptopId) => {
    setSelectedItems(prev => {
      if (prev[laptopId]) {
        const next = { ...prev }
        delete next[laptopId]
        return next
      }
      return {
        ...prev,
        [laptopId]: { condition: 'Good', notes: '' }
      }
    })
  }

  const updateItemCondition = (laptopId, condition) => {
    setSelectedItems(prev => ({ ...prev, [laptopId]: { ...prev[laptopId], condition } }))
  }

  const updateItemNotes = (laptopId, notes) => {
    setSelectedItems(prev => ({ ...prev, [laptopId]: { ...prev[laptopId], notes } }))
  }

  const getNextReceiptNumber = async () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const { count } = await supabase
      .from('return_receipts')
      .select('*', { count: 'exact', head: true })
      .like('receipt_number', `GLS/RR/${year}-${month}/%`)
    return `GLS/RR/${year}-${month}/${String((count || 0) + 1).padStart(3, '0')}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const itemsToReturn = Object.keys(selectedItems)
    if (itemsToReturn.length === 0) {
      toast({ title: 'Select at least one laptop to return', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const receiptNumber = await getNextReceiptNumber()

      // Create return receipt
      const { data: receipt, error: rcptError } = await supabase
        .from('return_receipts')
        .insert([{
          receipt_number: receiptNumber,
          challan_id: selectedChallanId,
          return_date: returnDate,
          notes,
        }])
        .select()
        .single()
      if (rcptError) throw rcptError

      // Create return items
      const items = itemsToReturn.map(laptopId => ({
        receipt_id: receipt.id,
        laptop_id: laptopId,
        condition: selectedItems[laptopId].condition,
        notes: selectedItems[laptopId].notes || null,
      }))
      const { error: itemsError } = await supabase.from('return_items').insert(items)
      if (itemsError) throw itemsError

      // Update laptop statuses
      for (const laptopId of itemsToReturn) {
        const condition = selectedItems[laptopId].condition
        const newStatus = condition === 'Damaged' ? 'Under Repair' : 'Available'
        await supabase.from('laptops').update({ status: newStatus }).eq('id', laptopId)
      }

      // Update challan status
      const totalChallanItems = selectedChallan?.challan_items?.length || 0
      const totalReturned = returnedLaptopIds.length + itemsToReturn.length
      const newChallanStatus = totalReturned >= totalChallanItems ? 'Returned' : 'Partially Returned'
      await supabase.from('challans').update({ status: newChallanStatus }).eq('id', selectedChallanId)

      toast({ title: 'Return receipt created', description: receiptNumber })
      setDialogOpen(false)
      setSelectedChallanId('')
      setReturnDate('')
      setNotes('')
      setSelectedItems({})
      await fetchReceipts()
      await fetchChallans()
      fetchLaptops()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const calculateLeaseDays = (deliveryDate, returnDate) => {
    if (!deliveryDate || !returnDate) return 0
    return differenceInDays(parseISO(returnDate), parseISO(deliveryDate)) + 1
  }

  const filtered = receipts.filter(r =>
    !search ||
    `${r.receipt_number} ${r.challans?.challan_number} ${r.challans?.customers?.company_name} ${r.challans?.customers?.name}`
      .toLowerCase().includes(search.toLowerCase())
  )

  const openDialog = () => {
    setSelectedChallanId('')
    setReturnDate(new Date().toISOString().split('T')[0])
    setNotes('')
    setSelectedItems({})
    setReturnedLaptopIds([])
    setDialogOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Return Receipts</h1>
          <p className="text-gray-500 mt-1">{receipts.length} receipts total</p>
        </div>
        <Button onClick={openDialog}>
          <Plus className="w-4 h-4 mr-2" /> Log Return
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by receipt number, challan number, customer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading return receipts...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No return receipts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Receipt No.</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Challan</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Return Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Laptops Returned</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Lease Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(receipt => {
                    const challan = challans.find(c => c.id === receipt.challan_id)
                    const leaseDays = challan
                      ? calculateLeaseDays(challan.delivery_date, receipt.return_date)
                      : 0
                    return (
                      <tr key={receipt.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-medium">{receipt.receipt_number}</td>
                        <td className="py-3 px-4 font-mono text-xs">{receipt.challans?.challan_number}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{receipt.challans?.customers?.company_name || receipt.challans?.customers?.name}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(receipt.return_date)}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {receipt.return_items?.map(item => (
                              <div key={item.id} className="flex items-center gap-2">
                                <span className="text-xs text-gray-700">
                                  {item.laptops?.brand} {item.laptops?.model} ({item.laptops?.serial_number})
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${{
                                  Good: 'bg-green-100 text-green-700',
                                  Damaged: 'bg-red-100 text-red-700',
                                  'Missing accessories': 'bg-yellow-100 text-yellow-700',
                                }[item.condition] || 'bg-gray-100 text-gray-700'}`}>
                                  {item.condition}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{leaseDays} days</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Return Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Return</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Active Challan *</Label>
                <Select
                  value={selectedChallanId}
                  onValueChange={v => { setSelectedChallanId(v); setSelectedItems({}) }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select challan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeChallans.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.challan_number} — {c.customers?.company_name || c.customers?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedChallan && (
                <div className="bg-gray-50 rounded-md p-3 text-sm">
                  <p className="text-gray-500">
                    Delivery: {formatDate(selectedChallan.delivery_date)} •
                    Expected return: {formatDate(selectedChallan.expected_return_date)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Return Date *</Label>
                <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} required />
              </div>

              {selectedChallanId && unreturnedItems.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Returning Laptops * ({Object.keys(selectedItems).length} selected)</Label>
                  <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
                    {unreturnedItems.map(item => {
                      const isSelected = !!selectedItems[item.laptop_id]
                      return (
                        <div key={item.laptop_id} className={`p-3 ${isSelected ? 'bg-blue-50' : ''}`}>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItem(item.laptop_id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {item.laptops?.brand} {item.laptops?.model}
                              </p>
                              <p className="text-xs text-gray-500">S/N: {item.laptops?.serial_number}</p>
                            </div>
                          </label>
                          {isSelected && (
                            <div className="mt-2 pl-6 space-y-2">
                              <div>
                                <Label className="text-xs">Condition on Return</Label>
                                <Select
                                  value={selectedItems[item.laptop_id]?.condition}
                                  onValueChange={v => updateItemCondition(item.laptop_id, v)}
                                >
                                  <SelectTrigger className="h-8 text-xs mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              {selectedItems[item.laptop_id]?.condition !== 'Good' && (
                                <div>
                                  <Label className="text-xs">Notes</Label>
                                  <Input
                                    className="h-8 text-xs mt-1"
                                    placeholder="Describe the issue..."
                                    value={selectedItems[item.laptop_id]?.notes || ''}
                                    onChange={e => updateItemNotes(item.laptop_id, e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedChallanId && unreturnedItems.length === 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                  All laptops from this challan have already been returned.
                </p>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any return notes..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || Object.keys(selectedItems).length === 0}>
                {saving ? 'Saving...' : 'Submit Return'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
