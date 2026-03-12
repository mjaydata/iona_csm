import { Bell, Mail, MessageSquare, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

export function Actions() {
  // Mock data for demonstration
  const recentActions = [
    { id: 1, type: 'email', account: 'Government of Ontario', action: 'Renewal reminder sent', status: 'completed', time: '2 hours ago' },
    { id: 2, type: 'notification', account: 'BC Hydro', action: 'At-risk alert triggered', status: 'pending', time: '4 hours ago' },
    { id: 3, type: 'email', account: 'Duke Energy', action: 'Quarterly review scheduled', status: 'completed', time: '1 day ago' },
    { id: 4, type: 'notification', account: 'Chelan County', action: 'Usage decline detected', status: 'pending', time: '1 day ago' },
    { id: 5, type: 'email', account: 'City of Seattle', action: 'Welcome email sent', status: 'completed', time: '2 days ago' },
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'notification':
        return <Bell className="w-4 h-4" />
      default:
        return <MessageSquare className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Actions & Notifications</h1>
        <p className="text-slate-500 mt-1">Track all automated actions and notifications sent to accounts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
              <Bell className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">156</p>
              <p className="text-sm text-slate-500">Total Actions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">142</p>
              <p className="text-sm text-slate-500">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">14</p>
              <p className="text-sm text-slate-500">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">0</p>
              <p className="text-sm text-slate-500">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Actions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View All
          </button>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-gray-200">
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Account
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentActions.map((action) => (
              <tr key={action.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    {getTypeIcon(action.type)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-800">{action.account}</span>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {action.action}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(action.status)}
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {action.time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
