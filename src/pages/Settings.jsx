import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Settings as SettingsIcon, Building2, CreditCard, Save, Bell } from 'lucide-react'

const defaultSettings = {
  business_name: 'GLS Infotech',
  address: '',
  phone: '',
  email: '',
  gstin: '',
  bank_name: '',
  bank_account: '',
  bank_ifsc: '',
  bank_branch: '',
}

export default function Settings() {
  const { toast } = useToast()
  const [form, setForm] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState(null)

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    if (data) {
      setSettingsId(data.id)
      setForm({
        business_name: data.business_name || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        gstin: data.gstin || '',
        bank_name: data.bank_name || '',
        bank_account: data.bank_account || '',
        bank_ifsc: data.bank_ifsc || '',
        bank_branch: data.bank_branch || '',
      })
    }
    setLoading(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (settingsId) {
        const { error } = await supabase.from('settings').update(form).eq('id', settingsId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('settings').insert([form]).select().single()
        if (error) throw error
        setSettingsId(data.id)
      }
      toast({ title: 'Settings saved successfully' })
    } catch (err) {
      toast({ title: 'Error saving settings', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading settings...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your business details for invoices and challans</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        {/* Business Details */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Business Details
            </CardTitle>
            <CardDescription>
              These details will appear on all invoices and delivery challans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input
                value={form.business_name}
                onChange={e => setForm({...form, business_name: e.target.value})}
                placeholder="GLS Infotech"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
                placeholder="Full business address including city, state and PIN"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="info@glsinfotech.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input
                value={form.gstin}
                onChange={e => setForm({...form, gstin: e.target.value})}
                placeholder="33AAAAA0000A1Z5"
                className="font-mono"
              />
              <p className="text-xs text-gray-500">
                Tamil Nadu GSTIN starts with 33. This will appear on all invoices.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Bank Details
            </CardTitle>
            <CardDescription>
              Bank account details for payment instructions on invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={form.bank_name}
                  onChange={e => setForm({...form, bank_name: e.target.value})}
                  placeholder="State Bank of India"
                />
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Input
                  value={form.bank_branch}
                  onChange={e => setForm({...form, bank_branch: e.target.value})}
                  placeholder="Anna Nagar Branch"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={form.bank_account}
                  onChange={e => setForm({...form, bank_account: e.target.value})}
                  placeholder="1234567890"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>IFSC Code</Label>
                <Input
                  value={form.bank_ifsc}
                  onChange={e => setForm({...form, bank_ifsc: e.target.value})}
                  placeholder="SBIN0001234"
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GST Info */}
        <Card className="bg-indigo-50 border-indigo-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <SettingsIcon className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-indigo-900 mb-1">GST Configuration</p>
                <p className="text-sm text-indigo-700">
                  GLS Infotech is registered in <strong>Tamil Nadu</strong>.
                </p>
                <ul className="text-sm text-indigo-700 mt-2 space-y-1">
                  <li>• <strong>Intra-state</strong> (TN → TN): CGST 9% + SGST 9%</li>
                  <li>• <strong>Inter-state</strong> (TN → Other states): IGST 18%</li>
                </ul>
                <p className="text-xs text-indigo-600 mt-2">
                  GST is automatically calculated based on the customer's state when generating invoices.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>

      {/* Notifications Section (outside form) */}
      <div className="max-w-2xl mt-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              Notifications
            </CardTitle>
            <CardDescription>Configure email notification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="email-notifications"
                disabled
                className="mt-1 cursor-not-allowed opacity-50"
              />
              <div>
                <label htmlFor="email-notifications" className="text-sm font-medium text-gray-700 cursor-not-allowed">
                  Enable email notifications <span className="text-xs text-gray-400">(coming soon)</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Email integration via Resend/SendGrid — configure SMTP in a future update.
                  When enabled, customers will automatically receive invoices and payment reminders by email.
                </p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <p className="text-xs text-amber-700">
                📧 <strong>Coming Soon:</strong> Automatic invoice emails, overdue payment reminders, and return due-date alerts.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
