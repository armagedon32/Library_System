import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUsageSummary, getBorrowerAnalytics, getClusteringResults, getUserClustering, getTransactions, getCollectionItems } from '../api/analytics';

const CLUSTER_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'];

function Reports() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [summary, setSummary] = useState(null);
  const [borrowers, setBorrowers] = useState({ top: [], all: [] });
  const [clusters, setClusters] = useState({ summary: [], newItemsCount: 0 });
  const [userSeg, setUserSeg] = useState({ summary: [], totalUsers: 0 });
  const [tx, setTx] = useState({ counts: {} });
  const [itemsTotal, setItemsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUsageSummary({ topLimit: 10, ...(timeRange ? { timeRange } : {}) }).catch(() => null),
      getBorrowerAnalytics().catch(() => ({ top: [], all: [] })),
      getClusteringResults().catch(() => ({ summary: [], newItemsCount: 0 })),
      getUserClustering().catch(() => ({ summary: [], totalUsers: 0 })),
      getTransactions('').catch(() => ({ counts: {} })),
      getCollectionItems({ limit: 500 }).catch(() => ({ total: 0 }))
    ]).then(([s, b, c, u, t, it]) => {
      setSummary(s);
      setBorrowers(b || { top: [], all: [] });
      setClusters(c || { summary: [], newItemsCount: 0 });
      setUserSeg(u || { summary: [], totalUsers: 0 });
      setTx(t || { counts: {} });
      setItemsTotal((it && it.total) || 0);
    }).finally(() => setLoading(false));
  }, [timeRange]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const totalBorrows = summary?.usageByCategory?.reduce((sum, c) => sum + c.totalBorrows, 0) || 0;
  const totalRenewals = summary?.usageByCategory?.reduce((sum, c) => sum + c.totalRenewals, 0) || 0;
  const generatedAt = new Date().toLocaleString();

  const Section = ({ title, children }) => (
    <div className="card report-card border-0 shadow-sm mb-4">
      <div className="card-header bg-white pt-3 px-4 border-bottom">
        <h6 className="fw-bold mb-0">{title}</h6>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body * { visibility: hidden; }
          #report-content, #report-content * { visibility: visible; }
          #report-content { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
          .no-print { display: none !important; }
          .report-card { box-shadow: none !important; border: 1px solid #ddd !important; break-inside: avoid; }
          .report-card .card-header { background: #fff !important; }
        }
      `}</style>

      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <div>
          <h4 className="fw-bold mb-1">Reports</h4>
          <p className="text-muted small mb-0">Printable summary reports for the library system</p>
        </div>
        <div className="d-flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="form-select form-select-sm" style={{ width: 'auto' }}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
            <option value="">All time</option>
          </select>
          <button className="btn btn-dark btn-sm" onClick={() => window.print()}>
            <i className="bi bi-printer me-1"></i>Print / Save as PDF
          </button>
        </div>
      </div>

      <div id="report-content">
        <div className="mb-4 text-center border-bottom pb-3">
          <h4 className="fw-bold mb-1">Library System — Summary Report</h4>
          <p className="text-muted small mb-0">
            Generated on {generatedAt} · Prepared by {user?.name} · Time range: {timeRange === '' ? 'All time' : timeRange}
          </p>
        </div>

        <div className="row g-3 mb-4">
          {[
            { label: 'Total Borrows', value: totalBorrows, icon: 'bi-journal-check' },
            { label: 'Total Renewals', value: totalRenewals, icon: 'bi-arrow-repeat' },
            { label: 'Currently Borrowed', value: tx.counts?.active || 0, icon: 'bi-bookmark-check' },
            { label: 'Returned', value: tx.counts?.returned || 0, icon: 'bi-arrow-return-left' },
            { label: 'Overdue', value: tx.counts?.overdue || 0, icon: 'bi-exclamation-triangle' },
            { label: 'Reservations', value: tx.counts?.reserved || 0, icon: 'bi-pin-angle' },
            { label: 'Registered Users', value: userSeg.totalUsers || 0, icon: 'bi-people' },
            { label: 'Collection Items', value: itemsTotal || 0, icon: 'bi-journal-richtext' },
          ].map((s, i) => (
            <div className="col-md-3 col-6" key={i}>
              <div className="card report-card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="text-muted small fw-medium mb-1">{s.label}</p>
                      <h3 className="fw-bold mb-0">{s.value}</h3>
                    </div>
                    <i className={`bi ${s.icon} text-primary fs-4 opacity-75`}></i>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Section title="Usage by Category">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Category</th>
                <th className="small fw-semibold text-end">Borrows</th>
                <th className="small fw-semibold text-end">Renewals</th>
                <th className="small fw-semibold text-end">Avg Dwell (days)</th>
                <th className="small fw-semibold text-end">Unique Users</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.usageByCategory || []).map((c, i) => (
                <tr key={i}>
                  <td className="fw-medium"><span className="badge me-2" style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}>&nbsp;</span>{c.category}</td>
                  <td className="text-end">{c.totalBorrows}</td>
                  <td className="text-end">{c.totalRenewals}</td>
                  <td className="text-end">{c.avgDwellTime}</td>
                  <td className="text-end">{c.uniqueUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Usage by Department">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Department</th>
                <th className="small fw-semibold text-end">Borrows</th>
                <th className="small fw-semibold text-end">Renewals</th>
                <th className="small fw-semibold text-end">Avg Dwell (days)</th>
                <th className="small fw-semibold text-end">Unique Users</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.usageByDepartment || []).map((d, i) => (
                <tr key={i}>
                  <td className="fw-medium">{d.department || 'N/A'}</td>
                  <td className="text-end">{d.totalBorrows}</td>
                  <td className="text-end">{d.totalRenewals}</td>
                  <td className="text-end">{d.avgDwellTime}</td>
                  <td className="text-end">{d.uniqueUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Top 10 Most Borrowed Books">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">#</th>
                <th className="small fw-semibold">Title</th>
                <th className="small fw-semibold">Author</th>
                <th className="small fw-semibold">Category</th>
                <th className="small fw-semibold text-end">Borrows</th>
                <th className="small fw-semibold text-end">Renewals</th>
                <th className="small fw-semibold text-end">Avg Dwell (days)</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.topItems || []).map((t, i) => (
                <tr key={i}>
                  <td className="text-muted">{i + 1}</td>
                  <td className="fw-medium">{t.title}</td>
                  <td className="text-muted">{t.author}</td>
                  <td><span className="badge bg-primary bg-opacity-10 text-primary">{t.category}</span></td>
                  <td className="text-end">{t.borrowCount}</td>
                  <td className="text-end">{t.totalRenewals}</td>
                  <td className="text-end">{(t.avgDwellTime || 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Top Borrowers">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Borrower</th>
                <th className="small fw-semibold text-end">Borrows</th>
                <th className="small fw-semibold text-end">Returns</th>
                <th className="small fw-semibold text-end">Avg Dwell (days)</th>
                <th className="small fw-semibold">Favorite Categories</th>
              </tr>
            </thead>
            <tbody>
              {(borrowers.top || []).slice(0, 10).map((b, i) => (
                <tr key={i}>
                  <td className="fw-medium">{b.borrowerName}</td>
                  <td className="text-end">{b.totalBorrows}</td>
                  <td className="text-end">{b.totalReturns}</td>
                  <td className="text-end">{b.avgDwellTime}</td>
                  <td>
                    {b.topCategories?.slice(0, 3).map((c, j) => (
                      <span key={j} className="badge bg-secondary me-1">{c.name} ({c.count})</span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="User Segmentation Summary">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Cluster</th>
                <th className="small fw-semibold text-end">Users</th>
                <th className="small fw-semibold text-end">Avg Borrows</th>
                <th className="small fw-semibold text-end">Avg Renewals</th>
                <th className="small fw-semibold text-end">Avg Dwell (days)</th>
                <th className="small fw-semibold text-end">Avg Overdue</th>
              </tr>
            </thead>
            <tbody>
              {(userSeg.summary || []).map((s, i) => (
                <tr key={s.cluster}>
                  <td className="fw-medium"><span className="badge me-2" style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }}>Cluster {s.cluster} \u2013 {s.label}</span></td>
                  <td className="text-end">{s.count}</td>
                  <td className="text-end">{s.avgBorrows}</td>
                  <td className="text-end">{s.avgRenewals != null ? s.avgRenewals : '—'}</td>
                  <td className="text-end">{s.avgDwell}</td>
                  <td className="text-end">{s.avgOverdue != null ? s.avgOverdue : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Book Clustering Summary">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Cluster</th>
                <th className="small fw-semibold text-end">Books</th>
                <th className="small fw-semibold text-end">Avg Usage Score</th>
                <th className="small fw-semibold text-end">Avg Retention</th>
                <th className="small fw-semibold text-end">Avg Borrows</th>
                <th className="small fw-semibold text-end">Avg Dwell (days)</th>
              </tr>
            </thead>
            <tbody>
              {(clusters.summary || []).map((c) => (
                <tr key={c._id}>
                  <td className="fw-medium"><span className="badge bg-dark">Cluster {c._id}</span></td>
                  <td className="text-end">{c.count}</td>
                  <td className="text-end">{Number(c.avgUsageScore || 0).toFixed(2)}</td>
                  <td className="text-end">{Number(c.avgRetentionScore || 0).toFixed(2)}</td>
                  <td className="text-end">{Number(c.avgBorrows || 0).toFixed(2)}</td>
                  <td className="text-end">{Number(c.avgDwellTime || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <div className="text-center text-muted small pt-2">
          Report generated automatically by the Library System — Collection Decision Framework.
        </div>
      </div>
    </div>
  );
}

export default Reports;