import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUsageSummary, getBorrowerAnalytics, getClusteringResults } from '../api/analytics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null);
  const [borrowers, setBorrowers] = useState({ top: [], all: [] });
  const [clusterSummary, setClusterSummary] = useState([]);
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [allSearch, setAllSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [showAllItems, setShowAllItems] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUsageSummary({ timeRange, ...(showAllItems ? { topLimit: 1000 } : {}) }).catch(() => null),
      getBorrowerAnalytics().catch(() => ({ top: [], all: [] })),
      getClusteringResults().catch(() => ({ summary: [] }))
    ]).then(([s, b, c]) => {
      setSummary(s);
      setBorrowers(b || { top: [], all: [] });
      setClusterSummary((c && c.summary) || []);
    }).finally(() => setLoading(false));
  }, [timeRange, showAllItems]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const totalBorrows = summary?.usageByCategory?.reduce((sum, cat) => sum + cat.totalBorrows, 0) || 0;
  const totalRenewals = summary?.usageByCategory?.reduce((sum, cat) => sum + cat.totalRenewals, 0) || 0;
  const totalCategories = summary?.usageByCategory?.length || 0;
  const totalDepartments = summary?.usageByDepartment?.length || 0;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Analytics Dashboard</h4>
          <p className="text-muted small mb-0">Collection usage insights and performance metrics</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="form-select form-select-sm" style={{ width: 'auto' }}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      <div className="row g-3 mb-4">
        {[
          { label: 'Total Borrows', value: totalBorrows, change: '+12%', icon: 'bi-journal-check', color: 'primary' },
          { label: 'Total Renewals', value: totalRenewals, change: '+8%', icon: 'bi-arrow-repeat', color: 'success' },
          { label: 'Categories', value: totalCategories, change: 'Active', icon: 'bi-grid', color: 'purple' },
          { label: 'Departments', value: totalDepartments, change: 'Active', icon: 'bi-building', color: 'orange' },
        ].map((card, i) => (
          <div className="col-md-3" key={i}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-muted small fw-medium mb-1">{card.label}</p>
                    <h3 className="fw-bold mb-0">{card.value}</h3>
                    <small className={`text-${card.color === 'purple' ? 'secondary' : card.color === 'orange' ? 'secondary' : card.color}`}>
                      {card.change}
                    </small>
                  </div>
                  <div className={`bg-${card.color} bg-opacity-10 rounded-3 p-3`}>
                    <i className={`bi ${card.icon} text-${card.color} fs-4`}></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-4"><i className="bi bi-bar-chart me-2"></i>Usage by Category</h6>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary?.usageByCategory || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Legend />
                  <Bar dataKey="totalBorrows" fill="#6366f1" name="Total Borrows" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalRenewals" fill="#10b981" name="Total Renewals" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="fw-bold mb-4"><i className="bi bi-pie-chart me-2"></i>Usage by Department</h6>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={summary?.usageByDepartment || []}
                    cx="50%" cy="50%" labelLine={false}
                    label={({ department, totalBorrows }) => `${department}: ${totalBorrows}`}
                    outerRadius={100} dataKey="totalBorrows"
                  >
                    {(summary?.usageByDepartment || []).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom-0 pt-4 px-4">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0"><i className="bi bi-diagram-3 me-2"></i>Book Cluster Distribution</h6>
                <Link to="/dashboard/clustering" className="btn btn-link btn-sm text-decoration-none p-0">View Details</Link>
              </div>
              <p className="text-muted small mb-0 mt-1">Distribution of collection items across K-Means clusters</p>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={clusterSummary.map((c) => ({ name: `Cluster ${c._id}`, value: c.count }))}
                    cx="50%" cy="50%" labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={95} dataKey="value"
                  >
                    {clusterSummary.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-md-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom-0 pt-4 px-4">
              <h6 className="fw-bold mb-0"><i className="bi bi-table me-2"></i>Book Clusters Overview</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="small fw-semibold">Cluster</th>
                    <th className="small fw-semibold">Books</th>
                    <th className="small fw-semibold">Avg Usage Score</th>
                    <th className="small fw-semibold">Avg Retention</th>
                    <th className="small fw-semibold">Avg Borrows</th>
                    <th className="small fw-semibold">Avg Dwell (days)</th>
                  </tr>
                </thead>
                <tbody>
                  {clusterSummary.length === 0 ? (
                    <tr><td colSpan="6" className="text-center text-muted py-4">No clustering results yet. Open the Book Clustering page to run K-Means.</td></tr>
                  ) : clusterSummary.map((c) => (
                    <tr key={c._id}>
                      <td><span className="badge bg-dark">Cluster {c._id}</span></td>
                      <td className="fw-medium">{c.count}</td>
                      <td>{Number(c.avgUsageScore || 0).toFixed(2)}</td>
                      <td>{Number(c.avgRetentionScore || 0).toFixed(2)}</td>
                      <td>{Number(c.avgBorrows || 0).toFixed(2)}</td>
                      <td className="text-muted">{Number(c.avgDwellTime || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0 pt-4 px-4">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0"><i className="bi bi-trophy me-2"></i>{showAllItems ? 'All Borrowed Items' : 'Top 10 Items'}</h6>
            <button className="btn btn-link btn-sm text-decoration-none p-0"
              onClick={() => setShowAllItems((v) => !v)}>
              {showAllItems ? 'Show Top 10' : 'View All'}
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small fw-semibold">Title</th>
                  <th className="small fw-semibold">Author</th>
                  <th className="small fw-semibold">Category</th>
                  <th className="small fw-semibold">Borrows</th>
                  <th className="small fw-semibold">Renewals</th>
                  <th className="small fw-semibold">Avg Dwell Time</th>
                </tr>
              </thead>
              <tbody>
                {summary?.topItems?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="fw-medium">{item.title}</td>
                    <td className="text-muted">{item.author}</td>
                    <td><span className="badge bg-primary bg-opacity-10 text-primary">{item.category}</span></td>
                    <td>{item.borrowCount}</td>
                    <td>{item.totalRenewals}</td>
                    <td className="text-muted">{item.avgDwellTime?.toFixed(1) || 0} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {borrowers.top?.length > 0 && (
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-header bg-white border-bottom-0 pt-4 px-4">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold mb-0"><i className="bi bi-trophy me-2"></i>Top Borrowers</h6>
                <p className="text-muted small mb-0 mt-1">Most active borrowers</p>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="small fw-semibold">Borrower</th>
                    <th className="small fw-semibold">Total Borrows</th>
                    <th className="small fw-semibold">Returns</th>
                    <th className="small fw-semibold">Avg Dwell (days)</th>
                    <th className="small fw-semibold">Favorite Categories</th>
                    <th className="small fw-semibold">Favorite Departments</th>
                    <th className="small fw-semibold">Last Borrow</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowers.top.filter(b => !borrowerSearch || b.borrowerName.toLowerCase().includes(borrowerSearch.toLowerCase())).map((b, idx) => (
                    <tr key={b.borrowerId}>
                      <td className="fw-medium">
                        <i className="bi bi-person-circle me-1 text-muted"></i>
                        {b.borrowerName}
                      </td>
                      <td><span className="badge bg-primary bg-opacity-10 text-primary fs-6">{b.totalBorrows}</span></td>
                      <td className="text-muted">{b.totalReturns}</td>
                      <td className="text-muted">{b.avgDwellTime}</td>
                      <td>
                        {b.topCategories?.map((c, i) => (
                          <span key={i} className="badge bg-secondary me-1">{c.name} ({c.count})</span>
                        ))}
                      </td>
                      <td>
                        {b.topDepartments?.map((d, i) => (
                          <span key={i} className="badge bg-info text-dark me-1">{d.name} ({d.count})</span>
                        ))}
                      </td>
                      <td className="text-muted small">
                        {b.lastBorrowDate ? new Date(b.lastBorrowDate).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {borrowers.all?.length > 0 && (
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-header bg-white border-bottom-0 pt-4 px-4">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0"><i className="bi bi-people me-2"></i>All Borrowers</h6>
              <div className="input-group input-group-sm" style={{ width: '250px' }}>
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input className="form-control" placeholder="Search borrower..." value={allSearch}
                  onChange={(e) => setAllSearch(e.target.value)} />
              </div>
            </div>
            <p className="text-muted small mb-0 mt-1">{borrowers.total} total borrowers</p>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th className="small fw-semibold">Borrower</th>
                    <th className="small fw-semibold">Total Borrows</th>
                    <th className="small fw-semibold">Returns</th>
                    <th className="small fw-semibold">Avg Dwell</th>
                    <th className="small fw-semibold">Favorite Categories</th>
                    <th className="small fw-semibold">Last Borrow</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowers.all.filter(b => !allSearch || b.borrowerName.toLowerCase().includes(allSearch.toLowerCase())).map((b) => (
                    <tr key={b.borrowerId}>
                      <td className="fw-medium"><i className="bi bi-person-circle me-1 text-muted"></i>{b.borrowerName}</td>
                      <td><span className="badge bg-primary bg-opacity-10 text-primary">{b.totalBorrows}</span></td>
                      <td className="text-muted">{b.totalReturns}</td>
                      <td className="text-muted">{b.avgDwellTime}d</td>
                      <td>{b.topCategories?.map((c, i) => <span key={i} className="badge bg-secondary me-1">{c.name}</span>)}</td>
                      <td className="text-muted small">{b.lastBorrowDate ? new Date(b.lastBorrowDate).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;