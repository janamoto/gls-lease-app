import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, statusColors } from '@/lib/utils'
import {
  Laptop, Users, AlertTriangle, Receipt, TrendingUp,
  FileText, RotateCcw, Clock, CheckCircle, X, AlertCircle,
  BarChart2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const PIE_COLORS = {
  Draft: '#94a3b8',
  Sent: '#3b82f6',
  Paid: '#22c55e',
  Overdue: '#ef4444',
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLaptops: 0,
    activeLeasesCount: 0,
    overdueReturns: 0,
    invoicesDueThisMonth: 0,
    overdueInvoices: 0,
    revenueThisMonth: 0,
  })
  const [overdueChallans, setOverdueChallans] = useState([])
  const [overduebannerDismissed, setOverdueBannerDismissed] = useState(false)
  const [recentActivity, setRecentActivity] = useState([])
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [invoiceStatusData, setInvoiceStatusData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      const today = now.toISOString().split('T')[0]

      const { count: totalLaptops } = await supabase
        .from('laptops').select('*', { count: 'exact', head: true })

      const { count: activeLeasesCount } = await supabase
        .from('challans').select('*', { count: 'exact', head: true })
        .in('status', ['Active', 'Partially Returned'])

      // Fetch overdue challans with customer info
      const { data: overdueChallanData } = await supabase
        .from('challans')
        .select('id, challan_number, expected_return_date, customers(name, company_name)')
        .in('status', ['Active', 'Partially Returned'])
        .lt('expected_return_date', today)
      setOverdueChallans(overdueChallanData || [])

      const { count: invoicesDueThisMonth } = await supabase
        .from('invoices').select('*', { count: 'exact', head: true })
        .in('status', ['Draft', 'Sent', 'Overdue'])
        .gte('invoice_date', monthStart)
        .lte('invoice_date', monthEnd)

      const { count: overdueInvoices } = await supabase
        .from('invoices').select('*', { count: 'exact', head: true })
        .eq('status', 'Overdue')

      const { data: paidInvoices } = await supabase
        .from('invoices').select('total_amount')
        .eq('status', 'Paid')
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd)

      const revenueThisMonth = (paidInvoices || []).reduce(
        (sum, inv) => sum + parseFloat(inv.total_amount || 0), 0
      )

      setStats({
        totalLaptops: totalLaptops || 0,
        activeLeasesCount: activeLeasesCount || 0,
        overdueReturns: (overdueChallanData || []).length,
        invoicesDueThisMonth: invoicesDueThisMonth || 0,
        overdueInvoices: overdueInvoices || 0,
        revenueThisMonth,
      })

      // Monthly revenue (last 6 months)
      const revenueData = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
        const { data: mInv } = await supabase
          .from('invoices').select('total_amount')
          .eq('status', 'Paid')
          .gte('payment_date', mStart)
          .lte('payment_date', mEnd)
        const total = (mInv || []).reduce((s, inv) => s + parseFloat(inv.total_amount || 0), 0)
        revenueData.push({ month: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`, revenue: total })
      }
      setMonthlyRevenue(revenueData)

      // Invoice status distribution
      const { data: allInvoices } = await supabase
        .from('invoices').select('status')
      const statusCounts = { Draft: 0, Sent: 0, Paid: 0, Overdue: 0 }
      ;(allInvoices || []).forEach(inv => {
        if (statusCounts[inv.status] !== undefined) statusCounts[inv.status]++
      })
      setInvoiceStatusData(
        Object.entries(statusCounts)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({ name, value }))
      )

      const [challansRes, returnsRes, invoicesRes] = await Promise.all([
        supabase.from('challans').select('id, challan_number, status, created_at, customers(name, company_name)')
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('return_receipts').select('id, receipt_number, created_at, challans(challan_number, customers(name, company_name))')
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('invoices').select('id, invoice_number, status, total_amount, created_at, customers(name, company_name)')
          .order('created_at', { ascending: false }).limit(5),
      ])

      const activities = [
        ...(challansRes.data || []).map(c => ({
          type: 'challan', id: c.id,
          title: `Challan ${c.challan_number}`,
          subtitle: c.customers?.company_name || c.customers?.name,
          status: c.status, date: c.created_at, link: `/challans/${c.id}`,
        })),
        ...(returnsRes.data || []).map(r => ({
          type: 'return', id: r.id,
          title: `Return ${r.receipt_number}`,
          subtitle: r.challans?.customers?.company_name || r.challans?.customers?.name,
          status: 'Returned', date: r.created_at, link: '/returns',
        })),
        ...(invoicesRes.data || []).map(inv => ({
          type: 'invoice', id: inv.id,
          title: `Invoice ${inv.invoice_number}`,
          subtitle: `${inv.customers?.company_name || inv.customers?.name} • ${formatCurrency(inv.total_amount)}`,
          status: inv.status, date: inv.created_at, link: `/invoices/${inv.id}`,
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)

      setRecentActivity(activities)
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Laptops',
      value: stats.totalLaptops,
      icon: Laptop, iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
      borderColor: 'border-l-blue-500', link: '/inventory',
    },
    {
      title: 'Active Leases',
      value: stats.activeLeasesCount,
      icon: FileText, iconBg: 'bg-green-100', iconColor: 'text-green-600',
      borderColor: 'border-l-green-500', link: '/challans',
    },
    {
      title: 'Overdue Returns',
      value: stats.overdueReturns,
      icon: AlertTriangle, iconBg: 'bg-red-100', iconColor: 'text-red-600',
      borderColor: 'border-l-red-500', link: '/challans',
      alert: stats.overdueReturns > 0,
    },
    {
      title: 'Invoices Due',
      value: stats.invoicesDueThisMonth,
      icon: Clock, iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600',
      borderColor: 'border-l-yellow-500', link: '/invoices',
    },
    {
      title: 'Overdue Invoices',
      value: stats.overdueInvoices,
      icon: AlertCircle, iconBg: 'bg-orange-100', iconColor: 'text-orange-600',
      borderColor: 'border-l-orange-500', link: '/invoices',
      alert: stats.overdueInvoices > 0,
    },
    {
      title: 'Revenue This Month',
      value: formatCurrency(stats.revenueThisMonth),
      icon: TrendingUp, iconBg: 'bg-purple-100', iconColor: 'text-purple-600',
      borderColor: 'border-l-purple-500', link: '/invoices',
      isCurrency: true,
    },
  ]

  const ActivityIcon = ({ type }) => {
    const icons = {
      challan: <FileText className="w-4 h-4 text-blue-600" />,
      return: <RotateCcw className="w-4 h-4 text-green-600" />,
      invoice: <Receipt className="w-4 h-4 text-purple-600" />,
    }
    const bgs = {
      challan: 'bg-blue-100', return: 'bg-green-100', invoice: 'bg-purple-100',
    }
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${bgs[type]}`}>
        {icons[type]}
      </div>
    )
  }

  const formatCurrencyShort = (v) => {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`
    return `₹${v}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Laptop className="w-10 h-10 text-indigo-600 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const today = new Date()

  return (
    <div>
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-xl p-6 mb-6 shadow-md">
        <h1 className="text-2xl font-bold">Welcome to GLS Infotech</h1>
        <p className="text-indigo-100 mt-1">
          {today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <p className="text-indigo-200 text-sm mt-2">Laptop Lease Management System</p>
      </div>

      {/* Overdue returns banner */}
      {!overduebannerDismissed && overdueChallans.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-800">⚠ Overdue Returns ({overdueChallans.length})</p>
            <div className="mt-1 space-y-1">
              {overdueChallans.map(c => (
                <p key={c.id} className="text-sm text-red-700">
                  <Link to={`/challans/${c.id}`} className="underline font-medium hover:text-red-900">
                    {c.challan_number}
                  </Link>
                  {' '}— {c.customers?.company_name || c.customers?.name}
                  {' '}(due: {formatDate(c.expected_return_date)})
                </p>
              ))}
            </div>
          </div>
          <button
            onClick={() => setOverdueBannerDismissed(true)}
            className="text-red-400 hover:text-red-700 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((card) => (
          <Link key={card.title} to={card.link}>
            <Card className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 ${card.borderColor} ${card.alert ? 'bg-red-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">{card.title}</p>
                    <p className={`font-bold ${card.alert ? 'text-red-700' : 'text-gray-900'} ${card.isCurrency ? 'text-base' : 'text-2xl'}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                    <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Revenue Chart */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="w-4 h-4 text-indigo-600" /> Monthly Revenue (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenue.every(d => d.revenue === 0) ? (
              <div className="text-center py-8 text-gray-400">
                <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No paid invoices yet</p>
                <p className="text-xs mt-1">Revenue will appear here as invoices are marked paid</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tickFormatter={formatCurrencyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} labelStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Invoice Status Pie Chart */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="w-4 h-4 text-indigo-600" /> Invoice Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoiceStatusData.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No invoices yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {invoiceStatusData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No recent activity</p>
              <p className="text-gray-400 text-sm mt-1">Activity will appear here as you add data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <Link key={`${activity.type}-${activity.id}-${index}`} to={activity.link}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <ActivityIcon type={activity.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                      <p className="text-xs text-gray-500 truncate">{activity.subtitle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[activity.status] || 'bg-gray-100 text-gray-800'}`}>
                        {activity.status}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(activity.date)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
