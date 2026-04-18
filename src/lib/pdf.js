import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFViewer,
  pdf,
} from '@react-pdf/renderer'
import { formatDate, formatIndianNumber } from './utils'
import { CGST_RATE, SGST_RATE, IGST_RATE } from './gst'

// Common styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 30,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
  },
  companyDetails: {
    fontSize: 9,
    color: '#555',
    marginTop: 2,
  },
  docTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    textAlign: 'right',
  },
  docNumber: {
    fontSize: 10,
    color: '#555',
    textAlign: 'right',
    marginTop: 4,
  },
  sectionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  sectionBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    marginBottom: 5,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 3,
  },
  labelValue: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    fontSize: 9,
    color: '#888',
    width: 80,
  },
  value: {
    fontSize: 9,
    color: '#333',
    flex: 1,
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a5f',
    padding: 6,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 6,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 9,
    color: '#333',
  },
  totalsBox: {
    alignSelf: 'flex-end',
    width: 250,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '5 8',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalsLabel: {
    fontSize: 9,
    color: '#555',
  },
  totalsValue: {
    fontSize: 9,
    color: '#333',
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '7 8',
    backgroundColor: '#1e3a5f',
  },
  grandTotalLabel: {
    fontSize: 10,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 10,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    paddingTop: 10,
  },
  signatureBox: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 9,
    color: '#555',
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    textAlign: 'center',
    fontSize: 8,
    color: '#aaa',
  },
  notesBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    marginBottom: 15,
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#555',
    marginBottom: 3,
  },
  notesText: {
    fontSize: 9,
    color: '#333',
  },
  badge: {
    padding: '2 6',
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
})

// Invoice PDF Component
export function InvoicePDF({ invoice, items, customer, settings }) {
  const isIntraState = customer?.state === 'Tamil Nadu'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{settings?.business_name || 'GLS Infotech'}</Text>
            <Text style={styles.companyDetails}>{settings?.address || ''}</Text>
            <Text style={styles.companyDetails}>
              Phone: {settings?.phone || ''} | Email: {settings?.email || ''}
            </Text>
            <Text style={styles.companyDetails}>GSTIN: {settings?.gstin || 'N/A'}</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>TAX INVOICE</Text>
            <Text style={styles.docNumber}>Invoice No: {invoice?.invoice_number}</Text>
            <Text style={styles.docNumber}>Date: {formatDate(invoice?.invoice_date)}</Text>
            <Text style={styles.docNumber}>
              Period: {formatDate(invoice?.period_start)} - {formatDate(invoice?.period_end)}
            </Text>
          </View>
        </View>

        {/* Customer & Invoice Details */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={[styles.value, { fontSize: 11, marginBottom: 4 }]}>
              {customer?.company_name || customer?.name}
            </Text>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{customer?.contact_person || customer?.name}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>
                {customer?.address}{customer?.city ? `, ${customer.city}` : ''}{customer?.state ? `, ${customer.state}` : ''} {customer?.pincode || ''}
              </Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{customer?.phone}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{customer?.email}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>GSTIN:</Text>
              <Text style={styles.value}>{customer?.gstin || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Invoice No:</Text>
              <Text style={styles.value}>{invoice?.invoice_number}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>{formatDate(invoice?.invoice_date)}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Period:</Text>
              <Text style={styles.value}>
                {formatDate(invoice?.period_start)} to {formatDate(invoice?.period_end)}
              </Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>GST Type:</Text>
              <Text style={styles.value}>{isIntraState ? 'CGST + SGST' : 'IGST'}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{invoice?.status}</Text>
            </View>
            {invoice?.payment_date && (
              <View style={styles.labelValue}>
                <Text style={styles.label}>Paid On:</Text>
                <Text style={styles.value}>{formatDate(invoice?.payment_date)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '5%' }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Laptop (Model/Serial)</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Lease Period</Text>
            <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>Days</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Monthly Rate (₹)</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Amount (₹)</Text>
          </View>
          {items?.map((item, index) => (
            <View key={item.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { width: '5%' }]}>{index + 1}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>
                {item.laptops?.brand} {item.laptops?.model}{'\n'}
                <Text style={{ color: '#888', fontSize: 8 }}>{item.laptops?.serial_number}</Text>
              </Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>
                {formatDate(item.lease_start)} -{'\n'}{formatDate(item.lease_end)}
              </Text>
              <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{item.days_leased}</Text>
              <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                {formatIndianNumber(item.monthly_rate)}
              </Text>
              <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>
                {formatIndianNumber(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={[styles.totalsRow, { borderTopWidth: 0 }]}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>₹{formatIndianNumber(invoice?.subtotal)}</Text>
          </View>
          {isIntraState ? (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>CGST ({CGST_RATE}%)</Text>
                <Text style={styles.totalsValue}>₹{formatIndianNumber(invoice?.cgst_amount)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>SGST ({SGST_RATE}%)</Text>
                <Text style={styles.totalsValue}>₹{formatIndianNumber(invoice?.sgst_amount)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IGST ({IGST_RATE}%)</Text>
              <Text style={styles.totalsValue}>₹{formatIndianNumber(invoice?.igst_amount)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>₹{formatIndianNumber(invoice?.total_amount)}</Text>
          </View>
        </View>

        {/* Bank Details */}
        {settings?.bank_name && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Bank Details for Payment</Text>
            <Text style={styles.notesText}>
              Bank: {settings.bank_name} | A/C: {settings.bank_account} | IFSC: {settings.bank_ifsc} | Branch: {settings.bank_branch}
            </Text>
          </View>
        )}

        {/* Notes */}
        {invoice?.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Customer Signature</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>
              For {settings?.business_name || 'GLS Infotech'}
            </Text>
            <Text style={[styles.signatureLabel, { marginTop: 3 }]}>Authorized Signatory</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a computer-generated invoice. | {settings?.business_name || 'GLS Infotech'} | GSTIN: {settings?.gstin || 'N/A'}
        </Text>
      </Page>
    </Document>
  )
}

// Challan PDF Component
export function ChallanPDF({ challan, items, customer, settings }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{settings?.business_name || 'GLS Infotech'}</Text>
            <Text style={styles.companyDetails}>{settings?.address || ''}</Text>
            <Text style={styles.companyDetails}>
              Phone: {settings?.phone || ''} | Email: {settings?.email || ''}
            </Text>
            <Text style={styles.companyDetails}>GSTIN: {settings?.gstin || 'N/A'}</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>DELIVERY CHALLAN</Text>
            <Text style={styles.docNumber}>Challan No: {challan?.challan_number}</Text>
            <Text style={styles.docNumber}>Date: {formatDate(challan?.delivery_date)}</Text>
          </View>
        </View>

        {/* Customer & Challan Details */}
        <View style={styles.sectionRow}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Deliver To</Text>
            <Text style={[styles.value, { fontSize: 11, marginBottom: 4 }]}>
              {customer?.company_name || customer?.name}
            </Text>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{customer?.contact_person || customer?.name}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>
                {customer?.address}{customer?.city ? `, ${customer.city}` : ''}{customer?.state ? `, ${customer.state}` : ''} {customer?.pincode || ''}
              </Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{customer?.phone}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>GSTIN:</Text>
              <Text style={styles.value}>{customer?.gstin || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Challan Details</Text>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Challan No:</Text>
              <Text style={styles.value}>{challan?.challan_number}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Delivery Date:</Text>
              <Text style={styles.value}>{formatDate(challan?.delivery_date)}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Expected Return:</Text>
              <Text style={styles.value}>{formatDate(challan?.expected_return_date)}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{challan?.status}</Text>
            </View>
            <View style={styles.labelValue}>
              <Text style={styles.label}>No. of Items:</Text>
              <Text style={styles.value}>{items?.length || 0}</Text>
            </View>
          </View>
        </View>

        {/* Laptop Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '5%' }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Brand</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Model</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Serial Number</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Specs</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Condition</Text>
          </View>
          {items?.map((item, index) => (
            <View key={item.id} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { width: '5%' }]}>{index + 1}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{item.laptops?.brand}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{item.laptops?.model}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{item.laptops?.serial_number}</Text>
              <Text style={[styles.tableCell, { width: '15%', fontSize: 8 }]}>
                {item.laptops?.ram_gb}GB RAM{'\n'}
                {item.laptops?.storage_gb}GB {item.laptops?.storage_type}
              </Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>{item.laptops?.condition}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {challan?.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{challan.notes}</Text>
          </View>
        )}

        {/* Declaration */}
        <View style={[styles.notesBox, { backgroundColor: '#f8fafc' }]}>
          <Text style={styles.notesText}>
            I/We hereby acknowledge receipt of the above-mentioned laptop(s) in good condition and agree to return them by {formatDate(challan?.expected_return_date)}. The equipment remains the property of {settings?.business_name || 'GLS Infotech'} at all times.
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Customer Signature & Seal</Text>
            <Text style={[styles.signatureLabel, { marginTop: 3, fontSize: 8 }]}>
              Name: _________________
            </Text>
            <Text style={[styles.signatureLabel, { marginTop: 2, fontSize: 8 }]}>
              Date: _________________
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>
              For {settings?.business_name || 'GLS Infotech'}
            </Text>
            <Text style={[styles.signatureLabel, { marginTop: 3 }]}>Authorized Signatory</Text>
            <Text style={[styles.signatureLabel, { marginTop: 2, fontSize: 8 }]}>
              Date: _________________
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a computer-generated delivery challan. | {settings?.business_name || 'GLS Infotech'} | GSTIN: {settings?.gstin || 'N/A'}
        </Text>
      </Page>
    </Document>
  )
}

// Download PDF helper
export async function downloadPDF(component, filename) {
  const blob = await pdf(component).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
