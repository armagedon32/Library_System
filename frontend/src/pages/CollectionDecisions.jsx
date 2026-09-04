import { useState, useEffect } from 'react';
import { getCollectionDecisions, updateItemStatus } from '../api/analytics';
import { useToast } from '../components/Toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';

const TONE_MAP = {
  success: { icon: 'bi-check-circle', label: 'Keep / Retain' },
  danger: { icon: 'bi-trash', label: 'Weed / Deselect' },
  info: { icon: 'bi-cart-plus', label: 'Acquire More' },
  warning: { icon: 'bi-question-circle', label: 'Review' },
  secondary: { icon: 'bi-eye', label: 'Monitor' },
};

function CollectionDecisions() {
  const { addToast } = useToast();
  const [data, setData] = useState({ decisions: [], summary: [], collectionSummary: {}, departments: [] });
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getCollectionDecisions();
      setData(res);
    } catch (error) {
      addToast('Failed to load collection decisions', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id, status) => {
    try {
      await updateItemStatus(id, status);
      addToast(`Item marked "${status}"`, 'success');
      const res = await getCollectionDecisions();
      setData(res);
    } catch (error) {
      addToast('Failed to update item', 'danger');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const { collectionSummary: c, summary, departments } = data;
  const statCards = [
    { label: 'Total Items', value: c.totalItems, icon: 'bi-journal-richtext', color: 'primary' },
    { label: 'Active Items', value: c.activeItems, icon: 'bi-check2-circle', color: 'success' },
    { label: 'Total Borrows', value: c.totalBorrows, icon: 'bi-arrow-repeat', color: 'info' },
    { label: 'Avg Usage Score', value: c.avgUsageScore, icon: 'bi-speedometer2', color: 'warning' },
    { label: 'Avg Collection Age', value: `${c.avgAgeYears} yrs`, icon: 'bi-clock-history', color: 'secondary' },
  ];

  const filtered = filter === 'All' ? data.decisions : data.decisions.filter((d) => d.decision === filter);

  const highDemandBooks = data.decisions
    .filter((d) => d.decision === 'Add More Copies' && d.copiesToAdd > 0)
    .sort((a, b) => b.borrows - a.borrows)
    .slice(0, 10)
    .map((d) => ({ name: d.title, borrows: d.borrows, copies: d.copies, copiesToAdd: d.copiesToAdd || 0, forecast: d.forecast || 0, department: d.department }));

  const deptCopies = data.departments.map((d) => ({ department: d.department, copiesToAdd: d.copiesToAdd }));

  const BookTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    const perCopy = data.forecastParams?.servicePerCopy || 4;
    const needed = Math.ceil(d.forecast / perCopy);
    return (
      <div className="bg-white border rounded-3 p-2 shadow-sm" style={{ fontSize: 12 }}>
        <div className="fw-semibold mb-1">{d.name}</div>
        <div className="text-muted mb-1">{d.department}</div>
        <div>Actual borrows: <b>{d.borrows}</b></div>
        <div>Projected borrows (12 mo): <b>{d.forecast}</b></div>
        <div>Current copies: <b>{d.copies}</b></div>
        <div>Books needed: <b>{needed}</b> <span className="text-muted">(= {d.forecast} ÷ {perCopy})</span></div>
        <div>Projected addition: <b className="text-primary">{d.copiesToAdd}</b> <span className="text-muted">(= {needed} − {d.copies})</span></div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Data-Driven Collection Decision Framework</h4>
        <p className="text-muted small mb-0">
          Automated keep / acquire / weed decisions derived from usage analytics, collection age, and condition.
        </p>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white pt-4 px-4 border-bottom-0">
          <h6 className="fw-bold mb-0"><i className="bi bi-diagram-3 me-2"></i>Clustering → Decisions Flow</h6>
          <small className="text-muted">How K-Means clustering informs collection decisions</small>
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-2 text-center">
              <div className="badge bg-primary p-3 fs-6"><i className="bi bi-diagram-3 fs-4"></i></div>
              <small className="text-muted d-block mt-2 fw-medium">Book Clustering</small>
              <small className="text-muted">K-Means by usage + content</small>
            </div>
            <div className="col-md-1 text-center">
              <i className="bi bi-arrow-right fs-3 text-muted"></i>
            </div>
            <div className="col-md-3 text-center">
              <div className="badge bg-info p-3 fs-6"><i className="bi bi-graph-up fs-4"></i></div>
              <small className="text-muted d-block mt-2 fw-medium">Usage Analytics</small>
              <small className="text-muted">Borrows, renewals, dwell, score</small>
            </div>
            <div className="col-md-1 text-center">
              <i className="bi bi-arrow-right fs-3 text-muted"></i>
            </div>
            <div className="col-md-3 text-center">
              <div className="badge bg-warning p-3 fs-6"><i className="bi bi-bar-chart fs-4"></i></div>
              <small className="text-muted d-block mt-2 fw-medium">Demand Analysis</small>
              <small className="text-muted">Forecast, coverage, gaps</small>
            </div>
            <div className="col-md-1 text-center">
              <i className="bi bi-arrow-right fs-3 text-muted"></i>
            </div>
            <div className="col-md-3 text-center">
              <div className="badge bg-success p-3 fs-6"><i className="bi bi-clipboard-check fs-4"></i></div>
              <small className="text-muted d-block mt-2 fw-medium">Collection Decision</small>
              <small className="text-muted">Retain / Acquire / Weed / Review</small>
            </div>
          </div>
          <hr className="my-3" />
          <div className="row g-3">
            <div className="col-md-4">
              <div className="p-3 border rounded-3 bg-light">
                <small className="text-muted d-block mb-1"><strong>High Usage Cluster</strong> → <span className="text-success">Retain / Add Copies</span></small>
                <small className="text-muted">High borrows + high usage score + high retention</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded-3 bg-light">
                <small className="text-muted"><strong>Low Usage Cluster</strong> → <span className="text-warning">Review / Weed</span></small>
                <small className="text-muted">Low borrows + low usage score + aged items</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded-3 bg-light">
                <small className="text-muted"><strong>New Items (Cluster -2)</strong> → <span className="text-info">Monitor</span></small>
                <small className="text-muted">Newly acquired items with no usage history yet</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {statCards.map((s) => (
          <div className="col-6 col-md-4 col-xl" key={s.label}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <small className="text-muted">{s.label}</small>
                  <i className={`bi ${s.icon} text-${s.color}`}></i>
                </div>
                <h5 className="fw-bold mb-0">{s.value}</h5>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-3 px-3 border-bottom-0">
              <h6 className="fw-bold mb-0"><i className="bi bi-fire text-warning me-2"></i>High Demand Books — Add More Copies</h6>
              <p className="text-muted small mb-0 mt-1">
                Orange = actual borrows, blue = <b>projected addition</b> (books to add based on demand). Hover a bar for the calculation:
                Projected Addition = (projected borrows ÷ {data.forecastParams?.servicePerCopy || 4}) − existing copies.
              </p>
            </div>
            <div className="card-body pt-2">
              {highDemandBooks.length === 0 ? (
                <p className="text-muted small text-center py-4">No books flagged for additional copies.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={highDemandBooks} layout="vertical" margin={{ left: 20, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
                    <Tooltip content={<BookTooltip />} cursor={{ fill: '#f3f4f6' }} />
                    <Legend />
                    <Bar dataKey="borrows" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Total Borrows" />
                    <Bar dataKey="copiesToAdd" fill="#6366f1" radius={[0, 4, 4, 0]} name="Projected Addition">
                      <LabelList dataKey="copiesToAdd" position="right" style={{ fontSize: 11, fill: '#6366f1' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-3 px-3 border-bottom-0">
              <h6 className="fw-bold mb-0"><i className="bi bi-cart-plus text-primary me-2"></i>Projected Addition by Department</h6>
              <p className="text-muted small mb-0 mt-1">Total books to add per department based on demand; matches the "Projected Addition" column in the Coverage & Acquisition Gaps table.</p>
            </div>
            <div className="card-body pt-2">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={deptCopies}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="copiesToAdd" fill="#6366f1" radius={[4, 4, 0, 0]} name="Projected Addition">
                    <LabelList dataKey="copiesToAdd" position="top" style={{ fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-3 px-3 border-bottom-0">
              <h6 className="fw-bold mb-0">Decision Breakdown</h6>
            </div>
            <div className="card-body pt-2">
              {summary.map((s) => (
                <div key={s.decision} className="d-flex align-items-center justify-content-between py-2 border-bottom">
                  <span className="small">{s.decision}</span>
                  <span className="badge bg-secondary">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white pt-4 px-3 border-bottom-0">
              <h6 className="fw-bold mb-0">Coverage & Acquisition Gaps by Department</h6>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="small">Department</th>
                    <th className="small">Items</th>
                    <th className="small">Borrows</th>
                    <th className="small">Borrow/Item</th>
                    <th className="small">Coverage</th>
                    <th className="small">Projected Addition</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.department}>
                      <td className="fw-medium">{d.department}</td>
                      <td>{d.itemCount}</td>
                      <td>{d.totalBorrows}</td>
                      <td>{d.borrowRatio}</td>
                      <td>
                        <span className={`badge bg-${d.coverage === 'Low' ? 'danger' : d.coverage === 'High' ? 'success' : 'secondary'}`}>
                          {d.coverage}
                        </span>
                      </td>
                      <td>{d.copiesToAdd > 0 ? <span className="fw-bold text-primary">{d.copiesToAdd}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white pt-4 px-4 border-bottom-0 d-flex flex-wrap align-items-center gap-2">
          <h6 className="fw-bold mb-0 me-auto">Item Decisions</h6>
          <select className="form-select form-select-sm w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>All</option>
            {summary.map((s) => (
              <option key={s.decision}>{s.decision}</option>
            ))}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <tbody>
                  <tr>
                    <td className="text-center text-muted py-4">No items match this decision.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small">Decision</th>
                  <th className="small">Title</th>
                  <th className="small">Author</th>
                  <th className="small">Dept</th>
                  <th className="small">Borrows</th>
                  <th className="small">Usage Score</th>
                  <th className="small">Copies</th>
                  <th className="small">Projected Addition</th>
                  <th className="small">Condition</th>
                  <th className="small">Reason</th>
                  <th className="small">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const tone = TONE_MAP[item.decisionTone] || { bg: 'secondary' };
                  return (
                    <tr key={item._id}>
                      <td>
                        <span className={`badge bg-${item.decisionTone}`}>{item.decision}</span>
                      </td>
                      <td className="fw-medium">{item.title}</td>
                      <td className="text-muted">{item.author}</td>
                      <td><small>{item.department}</small></td>
                      <td>{item.borrows}</td>
                      <td>{item.usageScore}</td>
                      <td>{item.copies}</td>
                      <td>{item.copiesToAdd > 0 ? <span className="fw-bold text-primary">{item.copiesToAdd}</span> : '—'}</td>
                      <td>{item.condition}</td>
                      <td className="text-muted small">{item.reason}</td>
                      <td style={{ minWidth: '150px' }}>
                        <button className="btn btn-sm btn-outline-success me-1" title={tone.bg === 'danger' ? 'Keep import' : 'Keep / Retain'} onClick={() => handleDecision(item._id, 'Active')}>
                          <i className="bi bi-check-lg"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-warning me-1" onClick={() => handleDecision(item._id, 'Flagged for Review')}>
                          <i className="bi bi-flag"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDecision(item._id, 'Recommend Retire')}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollectionDecisions;