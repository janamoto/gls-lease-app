import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Format date as DD/MM/YYYY
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return format(date, 'dd/MM/yyyy')
  } catch {
    return '-'
  }
}

// Format currency in Indian number system
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₹0'
  const num = parseFloat(amount)
  if (isNaN(num)) return '₹0'
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Format Indian number
export function formatIndianNumber(num) {
  if (num === null || num === undefined) return '0'
  return parseFloat(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Generate challan number: GLS/CH/YYYY-MM/NNN
export function generateChallanNumber(sequence, date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const seq = String(sequence).padStart(3, '0')
  return `GLS/CH/${year}-${month}/${seq}`
}

// Generate receipt number: GLS/RR/YYYY-MM/NNN
export function generateReceiptNumber(sequence, date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const seq = String(sequence).padStart(3, '0')
  return `GLS/RR/${year}-${month}/${seq}`
}

// Generate invoice number: GLS/YYYY-MM/NNN
export function generateInvoiceNumber(sequence, date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const seq = String(sequence).padStart(3, '0')
  return `GLS/${year}-${month}/${seq}`
}

// Get days in month
export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

// Calculate prorated amount
export function calculateProratedAmount(monthlyRate, daysLeased, year, month) {
  const daysInMonth = getDaysInMonth(year, month)
  return (monthlyRate / daysInMonth) * daysLeased
}

// Status badge colors
export const statusColors = {
  Available: 'bg-green-100 text-green-800',
  'On Lease': 'bg-blue-100 text-blue-800',
  'Under Repair': 'bg-yellow-100 text-yellow-800',
  Retired: 'bg-gray-100 text-gray-800',
  Active: 'bg-blue-100 text-blue-800',
  Returned: 'bg-green-100 text-green-800',
  'Partially Returned': 'bg-orange-100 text-orange-800',
  Draft: 'bg-gray-100 text-gray-800',
  Sent: 'bg-blue-100 text-blue-800',
  Paid: 'bg-green-100 text-green-800',
  Overdue: 'bg-red-100 text-red-800',
  Good: 'bg-green-100 text-green-800',
  Damaged: 'bg-red-100 text-red-800',
  'Missing accessories': 'bg-yellow-100 text-yellow-800',
}

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
]
