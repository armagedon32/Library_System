import { useState, useEffect } from 'react';
import { getAllReservations, cancelReservation } from '../api/analytics';
import { useToast } from '../components/Toast';

function Reservations() {
  const { addToast } = useToast();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllReservations();
      setReservations(data.reservations || []);
    } catch (e) {
      addToast('Failed to load reservations', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelReservation(id);
      addToast('Reservation cancelled', 'success');
      load();
    } catch (e) {
      addToast('Failed to cancel reservation', 'danger');
    }
  };

  const counts = {
    waiting: reservations.filter((r) => r.status === 'waiting').length,
    ready: reservations.filter((r) => r.status === 'ready').length,
  };

  const filtered = filter ? reservations.filter((r) => r.status === filter) : reservations;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h4 className="fw-bold mb-1">Reservations</h4>
          <p className="text-muted small mb-0">Monitor and manage book reservations</p>
        </div>
        <div className="d-flex gap-2">
          <button className={`btn btn-sm ${filter === '' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setFilter('')}>
            All <span className="badge bg-light text-dark ms-1">{reservations.length}</span>
          </button>
          <button className={`btn btn-sm ${filter === 'waiting' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setFilter('waiting')}>
            Waiting <span className="badge bg-info text-dark ms-1">{counts.waiting}</span>
          </button>
          <button className={`btn btn-sm ${filter === 'ready' ? 'btn-dark' : 'btn-outline-secondary'}`} onClick={() => setFilter('ready')}>
            Ready <span className="badge bg-success ms-1">{counts.ready}</span>
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Book</th>
                <th className="small fw-semibold">Reserved By</th>
                <th className="small fw-semibold">Department</th>
                <th className="small fw-semibold">Status</th>
                <th className="small fw-semibold">Reserved At</th>
                <th className="small fw-semibold">Ready At</th>
                <th className="small fw-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">No reservations found.</td>
                </tr>
              ) : filtered.map((r) => (
                <tr key={r._id}>
                  <td className="fw-medium">{r.itemTitle}</td>
                  <td>{r.userName}<div className="small text-muted">{r.userEmail}</div></td>
                  <td className="text-muted">{r.department}</td>
                  <td>
                    <span className={`badge ${r.status === 'ready' ? 'bg-success' : 'bg-info'}`}>
                      {r.status === 'ready' ? 'Ready for pickup' : 'Waiting'}
                    </span>
                  </td>
                  <td className="text-muted small">{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                  <td className="text-muted small">{r.readyAt ? new Date(r.readyAt).toLocaleString() : '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(r._id)}>
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Reservations;