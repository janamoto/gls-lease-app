import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useInvoiceStore } from '@/store/useInvoiceStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate, formatIndianNumber, statusColors } from '@/lib/utils'
import { CGST_RATE, SGST_RATE, IGST_RATE } from '@/lib/gst'
import { InvoicePDF, downloadPDF } from '@/lib/pdf.jsx'
import { PDFViewer } from '@react-pdf/renderer'
import {
  ArrowLeft, Download, Printer, FileText, CheckCircle, Send,
  Building2, Phone, Mail, MapPin,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { updateInvoiceStatus } = useInvoiceStore()
  const { toast } = useToast()

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [showPDF, setShowPDF] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchInvoice()
    fetchSettings()
  }, [id])

  const fetchInvoice = async () => {
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
    if (error) {
      toast({ title: 'Error loading invoice', variant: 'destructive' })
      navigate('/invoices')
    } else {
      setInvoice(data)
    }
    setLoading(false)
  }

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    setSettings(data)
  }

  const handleDownloadPDF = async () => {
    if (!invoice) return
    setDownloading(true)
    try {
      await downloadPDF(
        <InvoicePDF invoice={invoice} items={invoice.invoice_items} customer={invoice.customers} settings={settings} />,
        `Invoice-${invoice.invoice_number?.replace(/\//g, '-')}.pdf`
      )
    } catch (err) {
      toast({ title: 'PDF generation failed', description: err.message, variant: 'destructive' })
    } finally {
      setDownloading(false)
    }
  }

  const handleMarkPaid = async () => {
    try {
      await updateInvoiceStatus(id, 'Paid', payDate)
      setInvoice(prev => ({ ...prev, status: 'Paid', payment_date: payDate }))
      toast({ title: 'Invoice marked as paid' })
      setPayOpen(false)
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleStatusChange = async (status) => {
    try {
      await updateInvoiceStatus(id, status)
      setInvoice(prev => ({ ...prev, status }))
      toast({ title: `Invoice marked as ${status}` })
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading invoice...</div>
  if (!invoice) return null

  const customer = invoice.customers
  const isIntraState = customer?.state === 'Tamil Nadu'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 no-print flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1" />
        {invoice.status !== 'Paid' && (
          <>
            {invoice.status === 'Draft' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('Sent')}>
                <Send className="w-4 h-4 mr-1" /> Mark Sent
              </Button>
            )}
            <Button size="sm" className="bg-green-600 hover:bg-green-700"
              onClick={() => { setPayDate(new Date().toISOString().split('T')[0]); setPayOpen(true) }}>
              <CheckCircle className="w-4 h-4 mr-1" /> Mark Paid
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Print
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowPDF(!showPDF)}>
          <FileText className="w-4 h-4 mr-1" /> {showPDF ? 'Hide' : 'Preview'} PDF
        </Button>
        <Button size="sm" onClick={handleDownloadPDF} disabled={downloading}>
          <Download className="w-4 h-4 mr-1" /> {downloading ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      {showPDF && (
        <div className="mb-6 rounded-lg overflow-hidden border no-print" style={{ height: 700 }}>
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            <InvoicePDF invoice={invoice} items={invoice.invoice_items} customer={customer} settings={settings} />
          </PDFViewer>
        </div>
      )}

      {/* Invoice */}
      <div id="invoice-print">
        {/* Header */}
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4 border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{settings?.business_name || 'GLS Infotech'}</h2>
                <p className="text-sm text-gray-500 mt-1">{settings?.address}</p>
                <p className="text-sm text-gray-500">Phone: {settings?.phone} | Email: {settings?.email}</p>
                <p className="text-sm text-gray-500">GSTIN: {settings?.gstin || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-700">TAX INVOICE</p>
                <p className="text-sm font-mono font-semibold text-gray-700 mt-1">{invoice.invoice_number}</p>
                <p className="text-sm text-gray-500">Date: {formatDate(invoice.invoice_date)}</p>
                <p className="text-sm text-gray-500">
                  Period: {formatDate(invoice.period_start)} — {formatDate(invoice.period_end)}
                </p>
                <div className="mt-2 flex justify-end gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}`}>
                    {invoice.status}
                  </span>
                </div>
                {invoice.payment_date && (
                  <p className="text-xs text-gray-400 mt-1">Paid on: {formatDate(invoice.payment_date)}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
                <p className="font-semibold text-gray-900 text-base">{customer?.company_name || customer?.name}</p>
                {customer?.contact_person && (
                  <p className="text-sm text-gray-600">Attn: {customer.contact_person}</p>
                )}
                <div className="mt-1 space-y-1">
                  {customer?.address && (
                    <div className="flex items-start gap-1.5 text-sm text-gray-600">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                      <span>{customer.address}{customer.city ? `, ${customer.city}` : ''}{customer.state ? `, ${customer.state}` : ''} {customer.pincode}</span>
                    </div>
                  )}
                  {customer?.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer?.email && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer?.gstin && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono text-xs">GSTIN: {customer.gstin}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Invoice Details</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">GST Type:</span>
                    <span className="font-medium">{isIntraState ? 'CGST + SGST (Intra-state)' : 'IGST (Inter-state)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Invoice Date:</span>
                    <span className="font-medium">{formatDate(invoice.invoice_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Billing Period:</span>
                    <span className="font-medium">
                      {formatDate(invoice.period_start)} — {formatDate(invoice.period_end)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="mb-4">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Laptop (Model / Serial No.)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Challan</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Lease Period</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Days</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Monthly Rate</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_items?.map((item, index) => (
                  <tr key={item.id} className={`border-b ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="py-3 px-4 text-gray-500">{index + 1}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{item.laptops?.brand} {item.laptops?.model}</p>
                      <p className="text-xs text-gray-500 font-mono">{item.laptops?.serial_number}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 font-mono">{item.challans?.challan_number}</td>
                    <td className="py-3 px-4 text-xs text-gray-600">
                      {formatDate(item.lease_start)} — {formatDate(item.lease_end)}
                    </td>
                    <td className="py-3 px-4 text-center">{item.days_leased}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(item.monthly_rate)}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <Card className="w-80">
            <CardContent className="p-0">
              <div className="divide-y">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {isIntraState ? (
                  <>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-gray-600">CGST ({CGST_RATE}%)</span>
                      <span className="font-medium">{formatCurrency(invoice.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-gray-600">SGST ({SGST_RATE}%)</span>
                      <span className="font-medium">{formatCurrency(invoice.sgst_amount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-gray-600">IGST ({IGST_RATE}%)</span>
                    <span className="font-medium">{formatCurrency(invoice.igst_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3 bg-blue-700 text-white rounded-b-lg">
                  <span className="font-bold text-base">TOTAL</span>
                  <span className="font-bold text-base">{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bank Details */}
        {settings?.bank_name && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bank Details for Payment</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Bank Name</p>
                  <p className="font-medium">{settings.bank_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Account No.</p>
                  <p className="font-medium font-mono">{settings.bank_account}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">IFSC Code</p>
                  <p className="font-medium font-mono">{settings.bank_ifsc}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Branch</p>
                  <p className="font-medium">{settings.bank_branch}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Signatures */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-8 mt-4">
              <div>
                <div className="border-t border-gray-400 pt-3">
                  <p className="text-sm text-gray-500 text-center">Customer Signature</p>
                  <p className="text-xs text-gray-400 text-center mt-2">Name: _____________________</p>
                  <p className="text-xs text-gray-400 text-center mt-1">Date: _____________________</p>
                </div>
              </div>
              <div>
                <div className="border-t border-gray-400 pt-3">
                  <p className="text-sm text-gray-500 text-center">For {settings?.business_name || 'GLS Infotech'}</p>
                  <p className="text-sm text-gray-500 text-center mt-1">Authorized Signatory</p>
                  <p className="text-xs text-gray-400 text-center mt-2">Date: _____________________</p>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-6">
              This is a computer-generated invoice. — {settings?.business_name || 'GLS Infotech'} | GSTIN: {settings?.gstin || 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mark Paid Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
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
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkPaid} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" /> Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
