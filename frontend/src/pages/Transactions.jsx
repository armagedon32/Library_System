import { useState, useEffect } from 'react';
import { getTransactions } from '../api/analytics';
import { useToast } from '../components/Toast';

const FILTERS = [
  { key: '', label: 'All', icon: 'bi-collection' },
  { key: 'active', label: 'Borrowed', icon: 'bi-bookmark-check' },
  { key: 'overdue', label: 'Overdue', icon: 'bi-exclamation-triangle' },
  { key: 'returned', label: 'Returned', icon: 'bi-arrow-return-left' },
  { key: 'reserved', label: 'Reservations', icon: 'bi-pin-angle' },
];

function Transactions() {
  const { addToast } = useToast();
  const [data, setData] = useState({ transactions: [], counts: {} });
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const res = await getTransactions(filter);
      setData(res);
    } catch (e) {
      addToast('Failed to load transactions', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = data.transactions || [];
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        <button className="btn btn-sm btn-outline-secondary ms-auto" title="Refresh" onClick={load}>
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
              {paginatedTransactions.length === 0 ? (
                <tr><td colSpan="8" className="text-center text-muted py-4">No transactions found.</td></tr>
              ) : paginatedTransactions.map((t) => (
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

        {totalPages > 1 && (
          <div className="card-footer bg-white border-top-0">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </small>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>Previous</button>
                  </li>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(pageNum)}>{pageNum}</button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>Next</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transactions;