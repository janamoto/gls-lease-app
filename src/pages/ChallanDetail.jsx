import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { formatDate, statusColors } from '@/lib/utils'
import { ChallanPDF, downloadPDF } from '@/lib/pdf'
import { PDFViewer } from '@react-pdf/renderer'
import {
  ArrowLeft, Download, Printer, FileText, Calendar,
  Building2, Phone, MapPin,
} from 'lucide-react'

export default function ChallanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [challan, setChallan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [showPDF, setShowPDF] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetchChallan()
    fetchSettings()
  }, [id])

  const fetchChallan = async () => {
    const { data, error } = await supabase
      .from('challans')
      .select(`
        *,
        customers(*),
        challan_items(
          id, laptop_id,
          laptops(id, brand, model, serial_number, processor, ram_gb, storage_gb, storage_type, condition)
        )
      `)
      .eq('id', id)
      .single()
    if (error) {
      toast({ title: 'Error loading challan', description: error.message, variant: 'destructive' })
      navigate('/challans')
    } else {
      setChallan(data)
    }
    setLoading(false)
  }

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    setSettings(data)
  }

  const handleDownloadPDF = async () => {
    if (!challan) return
    setDownloading(true)
    try {
      await downloadPDF(
        <ChallanPDF challan={challan} items={challan.challan_items} customer={challan.customers} settings={settings} />,
        `Challan-${challan.challan_number?.replace(/\//g, '-')}.pdf`
      )
    } catch (err) {
      toast({ title: 'PDF generation failed', description: err.message, variant: 'destructive' })
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading challan...</div>
  }

  if (!challan) return null

  const isOverdue = challan.status !== 'Returned' && new Date(challan.expected_return_date) < new Date()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/challans')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handlePrint}>
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
        <div className="mb-6 rounded-lg overflow-hidden border no-print" style={{ height: 600 }}>
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            <ChallanPDF
              challan={challan}
              items={challan.challan_items}
              customer={challan.customers}
              settings={settings}
            />
          </PDFViewer>
        </div>
      )}

      {/* Printable Challan */}
      <div id="challan-print">
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
                <p className="text-2xl font-bold text-blue-700">DELIVERY CHALLAN</p>
                <p className="text-sm font-mono font-semibold text-gray-700 mt-1">{challan.challan_number}</p>
                <p className="text-sm text-gray-500">Date: {formatDate(challan.delivery_date)}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-2 ${statusColors[challan.status] || 'bg-gray-100 text-gray-800'}`}>
                  {challan.status}
                </span>
                {isOverdue && (
                  <p className="text-xs text-red-600 font-medium mt-1">⚠ Overdue</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Deliver To</p>
                <p className="font-semibold text-gray-900">{challan.customers?.company_name || challan.customers?.name}</p>
                {challan.customers?.contact_person && (
                  <p className="text-sm text-gray-600">Attn: {challan.customers.contact_person}</p>
                )}
                <div className="mt-1 space-y-1">
                  {challan.customers?.address && (
                    <div className="flex items-start gap-1.5 text-sm text-gray-600">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                      <span>{challan.customers.address}{challan.customers.city ? `, ${challan.customers.city}` : ''}{challan.customers.state ? `, ${challan.customers.state}` : ''} {challan.customers.pincode}</span>
                    </div>
                  )}
                  {challan.customers?.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{challan.customers.phone}</span>
                    </div>
                  )}
                  {challan.customers?.gstin && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono text-xs">{challan.customers.gstin}</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Challan Details</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">Delivery Date:</span>
                    <span className="font-medium">{formatDate(challan.delivery_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">Expected Return:</span>
                    <span className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                      {formatDate(challan.expected_return_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">Total Items:</span>
                    <span className="font-medium">{challan.challan_items?.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Laptop Items */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Laptop Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">#</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Brand</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Model</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Serial Number</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Specs</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Condition</th>
                </tr>
              </thead>
              <tbody>
                {challan.challan_items?.map((item, index) => (
                  <tr key={item.id} className={`border-b ${index % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    <td className="py-2.5 px-4 text-gray-500">{index + 1}</td>
                    <td className="py-2.5 px-4 font-medium">{item.laptops?.brand}</td>
                    <td className="py-2.5 px-4">{item.laptops?.model}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{item.laptops?.serial_number}</td>
                    <td className="py-2.5 px-4 text-xs text-gray-600">
                      {item.laptops?.ram_gb}GB RAM • {item.laptops?.storage_gb}GB {item.laptops?.storage_type}
                      {item.laptops?.processor && <span className="block text-gray-400">{item.laptops.processor}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-gray-600">{item.laptops?.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Notes */}
        {challan.notes && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700">{challan.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Declaration & Signatures */}
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-8 p-3 bg-gray-50 rounded-md">
              I/We hereby acknowledge receipt of the above-mentioned laptop(s) in good condition and agree to return them by <strong>{formatDate(challan.expected_return_date)}</strong>. The equipment remains the property of <strong>{settings?.business_name || 'GLS Infotech'}</strong> at all times.
            </p>
            <div className="grid grid-cols-2 gap-8 mt-4">
              <div>
                <div className="border-t border-gray-400 pt-3">
                  <p className="text-sm text-gray-500 text-center">Customer Signature & Seal</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
