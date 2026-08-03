import { useState, useEffect } from 'react';
import { getTransactions } from '../api/analytics';
import { useToast } from '../components/Toast';

const FILTERS = [
  { key: '', label: 'All', icon: 'bi-collection' },
  { key: 'active', label: 'Active', icon: 'bi-bookmark-check' },
  { key: 'overdue', label: 'Overdue', icon: 'bi-exclamation-triangle' },
  { key: 'returned', label: 'Returned', icon: 'bi-arrow-return-left' },
  { key: 'reserved', label: 'Reservations', icon: 'bi-pin-angle' },
];

function Transactions() {
  const { addToast } = useToast();
  const [data, setData] = useState({ transactions: [], counts: {} });
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTransactions(filter);
      setData(res);
    } catch (e) {
      addToast('Failed to load transactions', 'danger');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const statusBadge = (t) => {
    if (t.type === 'reservation') return <span className={`badge ${t.status === 'ready' ? 'bg-success' : 'bg-info'}`}>{t.status === 'ready' ? 'Ready' : 'Waiting'}</span>;
    if (t.isOverdue) return <span className="badge bg-danger">Overdue</span>;
    return <span className={`badge ${t.status === 'active' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{t.status}</span>;
  };

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Transactions</h4>
        <p className="text-muted small mb-0">All borrow, return & reservation records across users</p>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button key={f.key} className={`btn btn-sm ${filter === f.key ? 'btn-dark' : 'btn-outline-secondary'}`}
            onClick={() => setFilter(f.key)}>
            <i className={`bi ${f.icon} me-1`}></i>{f.label}
            <span className="badge bg-light text-dark ms-1">{f.key === '' ? (data.count || 0) : (data.counts?.[f.key] || 0)}</span>
          </button>
        ))}
        <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={load}>
          <i className="bi bi-arrow-clockwise"></i>
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Borrower</th>
                <th className="small fw-semibold">Book</th>
                <th className="small fw-semibold">Type</th>
                <th className="small fw-semibold">Status</th>
                <th className="small fw-semibold">Borrow Date</th>
                <th className="small fw-semibold">Due Date</th>
                <th className="small fw-semibold">Returned</th>
                <th className="small fw-semibold">Fine</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.length === 0 ? (
                <tr><td colSpan="8" className="text-center text-muted py-4">No transactions found.</td></tr>
              ) : data.transactions.map((t) => (
                <tr key={t._id}>
                  <td className="fw-medium">{t.borrowerName}
                    {t.department && <div className="small text-muted">{t.department}</div>}
                  </td>
                  <td className="text-muted">{t.itemTitle}</td>
                  <td><span className={`badge ${t.type === 'reservation' ? 'bg-warning text-dark' : 'bg-primary'}`}>{t.type}</span></td>
                  <td>{statusBadge(t)}</td>
                  <td className="small text-muted">{t.borrowDate ? new Date(t.borrowDate).toLocaleDateString() : '—'}</td>
                  <td className="small text-muted">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="small text-muted">{t.returnDate ? new Date(t.returnDate).toLocaleDateString() : '—'}</td>
                  <td>{t.fineAmount > 0 ? <span className="badge bg-danger">₱{t.fineAmount}</span> : <span className="text-muted small">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Transactions;