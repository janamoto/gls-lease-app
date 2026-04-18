import { useEffect, useState } from 'react'
import { useInventoryStore } from '@/store/useInventoryStore'
import { useMaintenanceStore } from '@/store/useMaintenanceStore'
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
import { formatDate, formatCurrency, statusColors } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, Laptop, Wrench, X } from 'lucide-react'

const LAPTOP_STATUSES = ['Available', 'On Lease', 'Under Repair', 'Retired']
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor']
const STORAGE_TYPES = ['SSD', 'HDD', 'NVMe SSD']
const MAINT_STATUSES = ['Pending', 'In Progress', 'Resolved']

const emptyForm = {
  brand: '', model: '', serial_number: '', processor: '',
  ram_gb: '', storage_gb: '', storage_type: 'SSD',
  condition: 'Good', status: 'Available',
  purchase_date: '', notes: '',
}

const emptyMaintForm = {
  maintenance_date: new Date().toISOString().split('T')[0],
  issue_description: '',
  resolution: '',
  cost: '',
  status: 'Resolved',
  technician: '',
}

export default function Inventory() {
  const { laptops, loading, fetchLaptops, addLaptop, updateLaptop, deleteLaptop } = useInventoryStore()
  const { records, fetchForLaptop, addRecord } = useMaintenanceStore()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editLaptop, setEditLaptop] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Maintenance dialog state
  const [maintOpen, setMaintOpen] = useState(false)
  const [maintLaptop, setMaintLaptop] = useState(null)
  const [maintLoading, setMaintLoading] = useState(false)
  const [maintForm, setMaintForm] = useState(emptyMaintForm)
  const [addMaintOpen, setAddMaintOpen] = useState(false)
  const [savingMaint, setSavingMaint] = useState(false)

  useEffect(() => { fetchLaptops() }, [])

  const filteredLaptops = laptops.filter(laptop => {
    const matchSearch = !search ||
      `${laptop.brand} ${laptop.model} ${laptop.serial_number} ${laptop.processor}`
        .toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || laptop.status === filterStatus
    return matchSearch && matchStatus
  })

  const openAdd = () => {
    setEditLaptop(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (laptop) => {
    setEditLaptop(laptop)
    setForm({
      brand: laptop.brand || '',
      model: laptop.model || '',
      serial_number: laptop.serial_number || '',
      processor: laptop.processor || '',
      ram_gb: laptop.ram_gb || '',
      storage_gb: laptop.storage_gb || '',
      storage_type: laptop.storage_type || 'SSD',
      condition: laptop.condition || 'Good',
      status: laptop.status || 'Available',
      purchase_date: laptop.purchase_date || '',
      notes: laptop.notes || '',
    })
    setDialogOpen(true)
  }

  const openMaintenance = async (laptop) => {
    setMaintLaptop(laptop)
    setMaintOpen(true)
    setMaintLoading(true)
    try {
      await fetchForLaptop(laptop.id)
    } catch (err) {
      toast({ title: 'Error loading maintenance records', description: err.message, variant: 'destructive' })
    } finally {
      setMaintLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        ram_gb: form.ram_gb ? parseInt(form.ram_gb) : null,
        storage_gb: form.storage_gb ? parseInt(form.storage_gb) : null,
        purchase_date: form.purchase_date || null,
      }
      if (editLaptop) {
        await updateLaptop(editLaptop.id, payload)
        toast({ title: 'Laptop updated successfully' })
      } else {
        await addLaptop(payload)
        toast({ title: 'Laptop added successfully' })
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
      await deleteLaptop(deleteId)
      toast({ title: 'Laptop deleted' })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setDeleteId(null)
    }
  }

  const handleAddMaintenance = async (e) => {
    e.preventDefault()
    setSavingMaint(true)
    try {
      await addRecord({
        ...maintForm,
        laptop_id: maintLaptop.id,
        cost: maintForm.cost ? parseFloat(maintForm.cost) : null,
      })
      toast({ title: 'Maintenance record added' })
      setAddMaintOpen(false)
      setMaintForm(emptyMaintForm)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setSavingMaint(false)
    }
  }

  const statusCounts = LAPTOP_STATUSES.reduce((acc, s) => {
    acc[s] = laptops.filter(l => l.status === s).length
    return acc
  }, {})

  const maintRecords = maintLaptop ? (records[maintLaptop.id] || []) : []

  const maintStatusColor = {
    Pending: 'bg-yellow-100 text-yellow-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    Resolved: 'bg-green-100 text-green-800',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 mt-1">{laptops.length} laptops total</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Laptop
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilterStatus('All')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filterStatus === 'All' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
          }`}
        >
          All ({laptops.length})
        </button>
        {LAPTOP_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {s} ({statusCounts[s] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by brand, model, serial number, processor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading laptops...</div>
          ) : filteredLaptops.length === 0 ? (
            <div className="text-center py-12">
              <Laptop className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No laptops found</p>
              {laptops.length === 0 && (
                <Button onClick={openAdd} variant="outline" className="mt-3">
                  <Plus className="w-4 h-4 mr-2" /> Add your first laptop
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Brand / Model</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Serial Number</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Specs</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Condition</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Purchase Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLaptops.map((laptop, idx) => (
                    <tr key={laptop.id} className={`border-b transition-colors ${idx % 2 === 1 ? 'bg-slate-50/50' : ''} hover:bg-gray-50`}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{laptop.brand}</p>
                        <p className="text-gray-500 text-xs">{laptop.model}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-700">{laptop.serial_number}</td>
                      <td className="py-3 px-4">
                        <p className="text-xs text-gray-600">{laptop.processor}</p>
                        <p className="text-xs text-gray-500">
                          {laptop.ram_gb && `${laptop.ram_gb}GB RAM`}
                          {laptop.ram_gb && laptop.storage_gb && ' • '}
                          {laptop.storage_gb && `${laptop.storage_gb}GB ${laptop.storage_type}`}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{laptop.condition}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[laptop.status] || 'bg-gray-100 text-gray-800'}`}>
                          {laptop.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(laptop.purchase_date)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm" variant="ghost"
                            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                            onClick={() => openMaintenance(laptop)}
                            title="Maintenance history"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(laptop)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteId(laptop.id)}
                            disabled={laptop.status === 'On Lease'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editLaptop ? 'Edit Laptop' : 'Add New Laptop'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Brand *</Label>
                <Input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Dell, HP, Lenovo..." required />
              </div>
              <div className="space-y-2">
                <Label>Model *</Label>
                <Input value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Latitude 5520, EliteBook 840..." required />
              </div>
              <div className="space-y-2">
                <Label>Serial Number *</Label>
                <Input value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="ABC123DEF456" required />
              </div>
              <div className="space-y-2">
                <Label>Processor</Label>
                <Input value={form.processor} onChange={e => setForm({...form, processor: e.target.value})} placeholder="Intel Core i5-1135G7" />
              </div>
              <div className="space-y-2">
                <Label>RAM (GB)</Label>
                <Input type="number" value={form.ram_gb} onChange={e => setForm({...form, ram_gb: e.target.value})} placeholder="8" min="1" />
              </div>
              <div className="space-y-2">
                <Label>Storage (GB)</Label>
                <Input type="number" value={form.storage_gb} onChange={e => setForm({...form, storage_gb: e.target.value})} placeholder="512" min="1" />
              </div>
              <div className="space-y-2">
                <Label>Storage Type</Label>
                <Select value={form.storage_type} onValueChange={v => setForm({...form, storage_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STORAGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={v => setForm({...form, condition: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LAPTOP_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any additional notes..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Laptop'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance History Dialog */}
      <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" />
              Maintenance — {maintLaptop?.brand} {maintLaptop?.model}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                S/N: <span className="font-mono">{maintLaptop?.serial_number}</span>
              </p>
              <Button size="sm" onClick={() => { setMaintForm(emptyMaintForm); setAddMaintOpen(true) }}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Record
              </Button>
            </div>

            {maintLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : maintRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Wrench className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No maintenance records yet</p>
                <p className="text-xs mt-1">Click "Add Record" to log a maintenance event</p>
              </div>
            ) : (
              <div className="space-y-3">
                {maintRecords.map(rec => (
                  <div key={rec.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{rec.issue_description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(rec.maintenance_date)}
                          {rec.technician && ` • Technician: ${rec.technician}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {rec.cost && (
                          <span className="text-xs font-medium text-gray-700">{formatCurrency(rec.cost)}</span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${maintStatusColor[rec.status] || 'bg-gray-100 text-gray-800'}`}>
                          {rec.status}
                        </span>
                      </div>
                    </div>
                    {rec.resolution && (
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">Resolution:</span> {rec.resolution}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Maintenance Record Dialog */}
      <Dialog open={addMaintOpen} onOpenChange={setAddMaintOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Maintenance Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMaintenance}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={maintForm.maintenance_date}
                    onChange={e => setMaintForm({...maintForm, maintenance_date: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={maintForm.status} onValueChange={v => setMaintForm({...maintForm, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MAINT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Issue Description *</Label>
                <Textarea value={maintForm.issue_description}
                  onChange={e => setMaintForm({...maintForm, issue_description: e.target.value})}
                  placeholder="Describe the issue or maintenance work..."
                  rows={2} required />
              </div>
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Textarea value={maintForm.resolution}
                  onChange={e => setMaintForm({...maintForm, resolution: e.target.value})}
                  placeholder="How was it resolved?"
                  rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Technician</Label>
                  <Input value={maintForm.technician}
                    onChange={e => setMaintForm({...maintForm, technician: e.target.value})}
                    placeholder="Technician name" />
                </div>
                <div className="space-y-2">
                  <Label>Cost (₹)</Label>
                  <Input type="number" min="0" step="0.01" value={maintForm.cost}
                    onChange={e => setMaintForm({...maintForm, cost: e.target.value})}
                    placeholder="0.00" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddMaintOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={savingMaint}>
                {savingMaint ? 'Saving...' : 'Add Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Laptop?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this laptop from the inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
