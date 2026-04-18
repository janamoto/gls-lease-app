import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInvoiceStore } from '@/store/useInvoiceStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate, statusColors } from '@/lib/utils'
import { Receipt, Search, Eye, Plus, RefreshCw, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function Invoices() {
  const { invoices, loading, fetchInvoices, generateMonthlyInvoices, updateInvoiceStatus, deleteInvoice } = useInvoiceStore()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [genYear, setGenYear] = useState(new Date().getFullYear())
  const [genMonth, setGenMonth] = useState(new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1)
  const [generating, setGenerating] = useState(false)
  const [payOpen, setPayOpen] = useState(null)
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [deleteId, setDeleteId] = useState(null)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    fetchInvoices()
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    setSettings(data)
  }

  const isOlderThan30Days = (dateStr) => {
    if (!dateStr) return false
    return differenceInDays(new Date(), parseISO(dateStr)) > 30
  }

  const filtered = invoices.filter(inv => {
    const matchSearch = !search ||
      `${inv.invoice_number} ${inv.customers?.company_name} ${inv.customers?.name}`
        .toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || inv.status === filterStatus
    const matchDateFrom = !dateFrom || inv.invoice_date >= dateFrom
    const matchDateTo = !dateTo || inv.invoice_date <= dateTo
    const amount = parseFloat(inv.total_amount || 0)
    const matchAmountMin = !amountMin || amount >= parseFloat(amountMin)
    const matchAmountMax = !amountMax || amount <= parseFloat(amountMax)
    return matchSearch && matchStatus && matchDateFrom && matchDateTo && matchAmountMin && matchAmountMax
  })

  const handleGenerate = async (e) => {
    e.preventDefault()
    setGenerating(true)
    try {
      const results = await generateMonthlyInvoices(genYear, genMonth, settings)
      const created = results.filter(r => r.status === 'created').length
      const skipped = results.filter(r => r.status === 'skipped').length
      toast({
        title: 'Invoices Generated',
        description: `${created} invoice(s) created, ${skipped} skipped (already exist).`,
      })
      setGenerateOpen(false)
    } catch (err) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const handleMarkPaid = async () => {
    try {
      await updateInvoiceStatus(payOpen, 'Paid', payDate)
      toast({ title: 'Invoice marked as paid' })
      setPayOpen(null)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleMarkSent = async (id) => {
    try {
      await updateInvoiceStatus(id, 'Sent')
      toast({
        title: 'Invoice marked as sent',
        description: 'Email notification feature coming soon.',
      })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleMarkOverdue = async (id) => {
    try {
      await updateInvoiceStatus(id, 'Overdue')
      toast({ title: 'Invoice marked as overdue' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    try {
      await deleteInvoice(deleteId)
      toast({ title: 'Invoice deleted' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setDeleteId(null)
    }
  }

  const totalRevenue = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)

  const pendingAmount = invoices
    .filter(inv => ['Draft', 'Sent', 'Overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0)

  const hasAdvancedFilters = dateFrom || dateTo || amountMin || amountMax

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">{invoices.length} invoices total</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Generate Invoices
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Invoices', value: invoices.length, color: 'text-gray-900' },
          { label: 'Paid', value: invoices.filter(i => i.status === 'Paid').length, color: 'text-green-700' },
          { label: 'Pending', value: invoices.filter(i => ['Draft','Sent','Overdue'].includes(i.status)).length, color: 'text-yellow-700' },
          { label: 'Overdue', value: invoices.filter(i => i.status === 'Overdue').length, color: 'text-red-700' },
        ].map(s => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Revenue (Paid)</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Pending Collection</p>
            <p className="text-2xl font-bold text-amber-700">{formatCurrency(pendingAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {s} ({s === 'All' ? invoices.length : invoices.filter(inv => inv.status === s).length})
          </button>
        ))}
      </div>

      {/* Search + advanced filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by invoice number or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-500 whitespace-nowrap">Invoice date from</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-sm h-8" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-500">to</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-sm h-8" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-gray-500 whitespace-nowrap">Amount ₹</Label>
            <Input type="number" placeholder="Min" value={amountMin} onChange={e => setAmountMin(e.target.value)} className="w-24 text-sm h-8" />
            <span className="text-xs text-gray-400">—</span>
            <Input type="number" placeholder="Max" value={amountMax} onChange={e => setAmountMax(e.target.value)} className="w-24 text-sm h-8" />
          </div>
          {hasAdvancedFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setAmountMin(''); setAmountMax('') }} className="text-xs h-8">
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading invoices...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No invoices found</p>
              <Button onClick={() => setGenerateOpen(true)} variant="outline" className="mt-3">
                <Plus className="w-4 h-4 mr-2" /> Generate invoices
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Invoice No.</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Period</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv, idx) => (
                    <tr key={inv.id} className={`border-b transition-colors ${idx % 2 === 1 ? 'bg-slate-50/50' : ''} hover:bg-gray-50`}>
                      <td className="py-3 px-4 font-mono text-xs font-medium">{inv.invoice_number}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium">{inv.customers?.company_name || inv.customers?.name}</p>
                        <p className="text-xs text-gray-500">{inv.customers?.state}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {formatDate(inv.period_start)} — {formatDate(inv.period_end)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(inv.invoice_date)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{formatCurrency(inv.total_amount)}</td>
                      <td className="py-3 px-4">
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                            {inv.status}
                          </span>
                          {inv.payment_date && (
                            <p className="text-xs text-gray-400 mt-0.5">Paid: {formatDate(inv.payment_date)}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== 'Paid' && (
                            <>
                              {inv.status === 'Draft' && (
                                <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                                  onClick={() => handleMarkSent(inv.id)}>
                                  Mark Sent
                                </Button>
                              )}
                              {inv.status === 'Sent' && isOlderThan30Days(inv.invoice_date) && (
                                <Button size="sm" variant="outline"
                                  className="text-xs h-7 px-2 text-orange-700 border-orange-200 hover:bg-orange-50"
                                  onClick={() => handleMarkOverdue(inv.id)}>
                                  <AlertCircle className="w-3 h-3 mr-1" /> Mark Overdue
                                </Button>
                              )}
                              <Button size="sm" variant="outline"
                                className="text-xs h-7 px-2 text-green-700 border-green-200 hover:bg-green-50"
                                onClick={() => { setPayOpen(inv.id); setPayDate(new Date().toISOString().split('T')[0]) }}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Paid
                              </Button>
                            </>
                          )}
                          <Link to={`/invoices/${inv.id}`}>
                            <Button size="sm" variant="outline" className="h-7 px-2">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          {inv.status === 'Draft' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setDeleteId(inv.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Monthly Invoices</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerate}>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                This will generate invoices for all customers who had active leases in the selected month. Per-laptop rates are used for calculation.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={String(genMonth)} onValueChange={v => setGenMonth(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={String(genYear)} onValueChange={v => setGenYear(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2023, 2024, 2025, 2026, 2027].map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3 text-sm text-indigo-700">
                <p className="font-medium mb-1">Billing Period: {MONTHS[genMonth]} {genYear}</p>
                <p className="text-xs">
                  GST: CGST+SGST for Tamil Nadu customers, IGST for other states.
                  Per-laptop rates are used. Existing invoices for this period will be skipped.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={generating}>
                <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating...' : 'Generate Invoices'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={!!payOpen} onOpenChange={() => setPayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button>
            <Button onClick={handleMarkPaid} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" /> Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this draft invoice. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
