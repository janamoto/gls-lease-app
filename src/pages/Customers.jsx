import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCustomerStore } from '@/store/useCustomerStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, INDIAN_STATES } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, Users, ChevronRight, Phone, Mail, MapPin, Building2 } from 'lucide-react'

const emptyForm = {
  name: '', company_name: '', contact_person: '', phone: '', email: '',
  address: '', city: '', state: 'Tamil Nadu', pincode: '', gstin: '',
  monthly_rate: '',
}

export default function Customers() {
  const { customers, loading, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomerStore()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [viewCustomer, setViewCustomer] = useState(null)
  const [customerHistory, setCustomerHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => { fetchCustomers() }, [])

  const filtered = customers.filter(c =>
    !search || `${c.name} ${c.company_name} ${c.phone} ${c.email} ${c.gstin}`
      .toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    setEditCustomer(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (customer) => {
    setEditCustomer(customer)
    setForm({
      name: customer.name || '',
      company_name: customer.company_name || '',
      contact_person: customer.contact_person || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || 'Tamil Nadu',
      pincode: customer.pincode || '',
      gstin: customer.gstin || '',
      monthly_rate: customer.monthly_rate || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        monthly_rate: form.monthly_rate ? parseFloat(form.monthly_rate) : null,
      }
      if (editCustomer) {
        await updateCustomer(editCustomer.id, payload)
        toast({ title: 'Customer updated successfully' })
      } else {
        await addCustomer(payload)
        toast({ title: 'Customer added successfully' })
      }
      setDialogOpen(false)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCustomer(deleteId)
      toast({ title: 'Customer deleted' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setDeleteId(null)
    }
  }

  const openHistory = async (customer) => {
    setViewCustomer(customer)
    setHistoryLoading(true)
    const { data } = await supabase
      .from('challans')
      .select(`*, challan_items(id, laptops(brand, model, serial_number))`)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
    setCustomerHistory(data || [])
    setHistoryLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">{customers.length} customers</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, company, phone, email, GSTIN..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading customers...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No customers found</p>
              {customers.length === 0 && (
                <Button onClick={openAdd} variant="outline" className="mt-3">
                  <Plus className="w-4 h-4 mr-2" /> Add your first customer
                </Button>
              )}
            </div>
          ) : (
            filtered.map(customer => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 font-bold text-sm">
                            {(customer.company_name || customer.name)[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{customer.company_name || customer.name}</p>
                          {customer.company_name && (
                            <p className="text-xs text-gray-500 truncate">{customer.name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(customer)}>
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteId(customer.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-gray-600 truncate">
                        <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.state && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{customer.city ? `${customer.city}, ` : ''}{customer.state}</span>
                      </div>
                    )}
                    {customer.gstin && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-mono text-xs">{customer.gstin}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Monthly Rate</p>
                      <p className="font-semibold text-gray-900">
                        {customer.monthly_rate ? formatCurrency(customer.monthly_rate) + '/laptop' : 'Not set'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openHistory(customer)}>
                      Lease History <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} placeholder="Acme Corp Pvt Ltd" />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} placeholder="Primary contact name" />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 98765 43210" required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="contact@company.com" />
              </div>
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} placeholder="33AAAAA0000A1Z5" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Street address" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Chennai" />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} placeholder="600001" />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Select value={form.state} onValueChange={v => setForm({...form, state: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly Rate (₹/laptop) *</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.monthly_rate}
                  onChange={e => setForm({...form, monthly_rate: e.target.value})}
                  placeholder="5000"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Customer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!viewCustomer} onOpenChange={() => setViewCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Lease History — {viewCustomer?.company_name || viewCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {historyLoading ? (
              <div className="text-center py-8 text-gray-500">Loading history...</div>
            ) : customerHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No lease history found</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {customerHistory.map(challan => (
                  <div key={challan.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{challan.challan_number}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${{
                        Active: 'bg-blue-100 text-blue-800',
                        Returned: 'bg-green-100 text-green-800',
                        'Partially Returned': 'bg-orange-100 text-orange-800',
                      }[challan.status] || 'bg-gray-100 text-gray-800'}`}>
                        {challan.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Delivered: {challan.delivery_date} • Expected return: {challan.expected_return_date}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {challan.challan_items?.map(item => (
                        <span key={item.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {item.laptops?.brand} {item.laptops?.model} ({item.laptops?.serial_number})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this customer. Make sure there are no active leases or invoices for this customer.
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
