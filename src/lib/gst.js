// GST Calculation Helpers for GLS Infotech
// Tamil Nadu is the home state - intra-state: CGST 9% + SGST 9%
// Inter-state: IGST 18%

const HOME_STATE = 'Tamil Nadu'
const GST_RATE = 0.18 // 18% total GST

export function isIntraState(customerState) {
  return customerState === HOME_STATE
}

export function calculateGST(subtotal, customerState) {
  const gstAmount = subtotal * GST_RATE

  if (isIntraState(customerState)) {
    const cgst = gstAmount / 2
    const sgst = gstAmount / 2
    return {
      cgst_amount: parseFloat(cgst.toFixed(2)),
      sgst_amount: parseFloat(sgst.toFixed(2)),
      igst_amount: 0,
      total_gst: parseFloat(gstAmount.toFixed(2)),
      is_intra_state: true,
    }
  } else {
    return {
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: parseFloat(gstAmount.toFixed(2)),
      total_gst: parseFloat(gstAmount.toFixed(2)),
      is_intra_state: false,
    }
  }
}

export function calculateInvoiceTotals(lineItems, customerState) {
  const subtotal = lineItems.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
  const gst = calculateGST(subtotal, customerState)
  const total = subtotal + gst.total_gst

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    ...gst,
    total_amount: parseFloat(total.toFixed(2)),
  }
}

// Calculate lease amount for a laptop over a date range within a billing month
export function calculateLeaseAmount(monthlyRate, leaseStart, leaseEnd, billingYear, billingMonth) {
  const daysInMonth = new Date(billingYear, billingMonth + 1, 0).getDate()

  // Clamp dates to billing month
  const monthStart = new Date(billingYear, billingMonth, 1)
  const monthEnd = new Date(billingYear, billingMonth + 1, 0)

  const effectiveStart = leaseStart < monthStart ? monthStart : leaseStart
  const effectiveEnd = leaseEnd > monthEnd ? monthEnd : leaseEnd

  if (effectiveStart > effectiveEnd) return { days: 0, amount: 0 }

  const msPerDay = 24 * 60 * 60 * 1000
  const daysLeased = Math.floor((effectiveEnd - effectiveStart) / msPerDay) + 1

  const dailyRate = monthlyRate / daysInMonth
  const amount = dailyRate * daysLeased

  return {
    days: daysLeased,
    amount: parseFloat(amount.toFixed(2)),
  }
}

export const CGST_RATE = 9
export const SGST_RATE = 9
export const IGST_RATE = 18
