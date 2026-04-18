import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useChallanStore } from '@/store/useChallanStore'
import { useCustomerStore } from '@/store/useCustomerStore'
import { useInventoryStore } from '@/store/useInventoryStore'
import { supabase } from '@/lib/supabase'
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
import { formatDate, formatCurrency, statusColors } from '@/lib/utils'
import { Plus, Search, FileText, Eye } from 'lucide-react'

const emptyForm = {
  customer_id: '', delivery_date: '', expected_return_date: '', notes: '',
}

export default function Challans() {
  const { challans, loading, fetchChallans, createChallan } = useChallanStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const { laptops, fetchLaptops } = useInventoryStore()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [selectedLaptops, setSelectedLaptops] = useState([])
  const [laptopRates, setLaptopRates] = useState({}) // laptopId -> rate
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchChallans()
    fetchCustomers()
    fetchLaptops()
  }, [])

  const availableLaptops = laptops.filter(l => l.status === 'Available')

  const selectedCustomer = customers.find(c => c.id === form.customer_id)

  const getNextSequence = async () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const { count } = await supabase
      .from('challans')
      .select('*', { count: 'exact', head: true })
      .like('challan_number', `GLS/CH/${year}-${month}/%`)
    return (count || 0) + 1
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (selectedLaptops.length === 0) {
      toast({ title: 'Select at least one laptop', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const seq = await getNextSequence()
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const challanNumber = `GLS/CH/${year}-${month}/${String(seq).padStart(3, '0')}`

      await createChallan({
        challan: { ...form, challan_number: challanNumber, status: 'Active' },
        laptopIds: selectedLaptops,
        laptopRates,
      })
      toast({ title: 'Challan created successfully', description: challanNumber })
      setDialogOpen(false)
      setForm(emptyForm)
      setSelectedLaptops([])
      setLaptopRates({})
      fetchLaptops()
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const toggleLaptop = (id) => {
    setSelectedLaptops(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(l => l !== id)
        const newRates = { ...laptopRates }
        delete newRates[id]
        setLaptopRates(newRates)
        return next
      }
      // Default rate to customer's monthly_rate
      if (selectedCustomer?.monthly_rate) {
        setLaptopRates(r => ({ ...r, [id]: selectedCustomer.monthly_rate }))
      }
      return [...prev, id]
    })
  }

  const filtered = challans.filter(c => {
    const matchSearch = !search ||
      `${c.challan_number} ${c.customers?.company_name} ${c.customers?.name}`
        .toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || c.status === filterStatus
    const matchDateFrom = !dateFrom || c.delivery_date >= dateFrom
    const matchDateTo = !dateTo || c.delivery_date <= dateTo
    return matchSearch && matchStatus && matchDateFrom && matchDateTo
  })

  const isOverdue = (challan) => {
    if (challan.status === 'Returned') return false
    return new Date(challan.expected_return_date) < new Date()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Challans</h1>
          <p className="text-gray-500 mt-1">{challans.length} challans total</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setSelectedLaptops([]); setLaptopRates({}); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" /> Create Challan
        </Button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['All', 'Active', 'Partially Returned', 'Returned'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {s} ({s === 'All' ? challans.length : challans.filter(c => c.status === s).length})
          </button>
        ))}
      </div>

      {/* Search + date filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by challan number or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-500 whitespace-nowrap">Delivery from</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-500">to</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-sm" />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs">
            Clear dates
          </Button>
        )}
      </div>

      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading challans...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No challans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Challan No.</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Delivery Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Expected Return</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Laptops</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((challan, idx) => (
                    <tr key={challan.id} className={`border-b transition-colors ${isOverdue(challan) ? 'bg-red-50' : idx % 2 === 1 ? 'bg-slate-50/50' : ''} hover:bg-gray-50`}>
                      <td className="py-3 px-4">
                        <p className="font-medium font-mono text-xs text-gray-900">{challan.challan_number}</p>
                        {isOverdue(challan) && (
                          <span className="text-xs text-red-600 font-medium">⚠ Overdue</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{challan.customers?.company_name || challan.customers?.name}</p>
                        <p className="text-xs text-gray-500">{challan.customers?.phone}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(challan.delivery_date)}</td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(challan.expected_return_date)}</td>
                      <td className="py-3 px-4 text-gray-600">{challan.challan_items?.length || 0} laptop(s)</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[challan.status] || 'bg-gray-100 text-gray-800'}`}>
                          {challan.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/challans/${challan.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Delivery Challan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select
                  value={form.customer_id}
                  onValueChange={v => {
                    setForm({...form, customer_id: v})
                    // Reset rates when customer changes
                    setLaptopRates({})
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name || c.name} {c.phone ? `(${c.phone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delivery Date *</Label>
                  <Input type="date" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Expected Return Date *</Label>
                  <Input type="date" value={form.expected_return_date} onChange={e => setForm({...form, expected_return_date: e.target.value})} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Laptops & Rates * ({selectedLaptops.length} selected)</Label>
                {availableLaptops.length === 0 ? (
                  <p className="text-sm text-gray-500 py-3 px-3 bg-gray-50 rounded-md">
                    No available laptops.
                  </p>
                ) : (
                  <div className="border rounded-md max-h-64 overflow-y-auto">
                    {availableLaptops.map(laptop => {
                      const isSelected = selectedLaptops.includes(laptop.id)
                      return (
                        <div
                          key={laptop.id}
                          className={`px-3 py-2.5 border-b last:border-b-0 ${isSelected ? 'bg-indigo-50' : ''}`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleLaptop(laptop.id)}
                              className="rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{laptop.brand} {laptop.model}</p>
                              <p className="text-xs text-gray-500">
                                S/N: {laptop.serial_number} • {laptop.ram_gb}GB RAM • {laptop.storage_gb}GB {laptop.storage_type}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500 whitespace-nowrap">₹/month</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Rate"
                                  value={laptopRates[laptop.id] || ''}
                                  onChange={e => setLaptopRates(r => ({ ...r, [laptop.id]: parseFloat(e.target.value) || '' }))}
                                  className="w-28 h-7 text-xs"
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                            )}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                )}
                {selectedCustomer?.monthly_rate && (
                  <p className="text-xs text-gray-500">
                    Default rate from customer profile: {formatCurrency(selectedCustomer.monthly_rate)}/laptop/month
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any delivery notes..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || selectedLaptops.length === 0}>
                {saving ? 'Creating...' : 'Create Challan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
