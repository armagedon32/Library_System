import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyUsage, borrowItem, reserveItem, getMyReservations, cancelReservation, getRecommendationsForMe } from '../api/analytics';
import BorrowModal from '../components/BorrowModal';
import { useToast } from '../components/Toast';

function UserDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowItemData, setBorrowItemData] = useState(null);

  useEffect(() => {
    loadData();
    getMyReservations().then(d => setReservations(d.reservations || [])).catch(() => {});
    getRecommendationsForMe().then(d => setRecommendations(d.recommendations || [])).catch(() => {});
  }, []);

  const loadData = () => {
    setLoading(true);
    getMyUsage().then(setData).catch(console.error).finally(() => setLoading(false));
  };

  const handleReserve = async (item) => {
    try {
      await reserveItem(item._id);
      addToast(`"${item.title}" reserved successfully!`, 'success');
      getMyReservations().then(d => setReservations(d.reservations || [])).catch(() => {});
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reserve', 'danger');
    }
  };

  const handleCancelReserve = async (res) => {
    try {
      await cancelReservation(res._id);
      addToast('Reservation cancelled', 'success');
      setReservations(reservations.filter(r => r._id !== res._id));
    } catch (err) {
      addToast('Failed to cancel reservation', 'danger');
    }
  };

  const openBorrowForm = (item) => {
    setBorrowItemData(item);
    setShowBorrowModal(true);
  };

  const confirmBorrow = async (form) => {
    try {
      await borrowItem(borrowItemData._id, form);
      addToast(`Borrowed "${borrowItemData.title}" successfully!`, 'success');
      setShowBorrowModal(false);
      setBorrowItemData(null);
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to borrow', 'danger');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Welcome, {user?.name}!</h4>
        <p className="text-muted small mb-0">Your Library Dashboard — overview of your borrowing activity</p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted small fw-medium mb-1">Total Borrowed</p>
                  <h3 className="fw-bold mb-0">{data?.stats?.totalBorrowed || 0}</h3>
                </div>
                <div className="bg-primary bg-opacity-10 rounded-3 p-3">
                  <i className="bi bi-book text-primary fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted small fw-medium mb-1">Currently Borrowed</p>
                  <h3 className="fw-bold mb-0">{data?.stats?.currentlyBorrowed || 0}</h3>
                </div>
                <div className="bg-warning bg-opacity-10 rounded-3 p-3">
                  <i className="bi bi-clock text-warning fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted small fw-medium mb-1">Overdue Items</p>
                  <h3 className="fw-bold mb-0">{data?.stats?.overdueCount || 0}</h3>
                </div>
                <div className="bg-danger bg-opacity-10 rounded-3 p-3">
                  <i className="bi bi-exclamation-triangle text-danger fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted small fw-medium mb-1">Department</p>
                  <h6 className="fw-bold mb-0 text-truncate">{user?.department || 'N/A'}</h6>
                </div>
                <div className="bg-info bg-opacity-10 rounded-3 p-3">
                  <i className="bi bi-building text-info fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom-0 pt-4 px-4">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0"><i className="bi bi-stars me-2"></i>Recommended for You</h6>
            <span className="badge bg-primary">{recommendations.length}</span>
          </div>
          <p className="text-muted small mb-0 mt-1">Personalized picks based on your frequently-borrowed categories & reading history</p>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Title</th>
                <th className="small fw-semibold">Author</th>
                <th className="small fw-semibold">Category</th>
                <th className="small fw-semibold">Why</th>
                <th className="small fw-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {recommendations.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted py-4">No recommendations yet — borrow books first to get personalized picks.</td></tr>
              ) : recommendations.slice(0, 8).map((r) => (
                <tr key={r._id}>
                  <td className="fw-medium">{r.title}</td>
                  <td className="text-muted">{r.author}</td>
                  <td><span className="badge bg-primary bg-opacity-10 text-primary">{r.category}</span></td>
                  <td className="text-muted small">{r.reason}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openBorrowForm(r)}>
                      <i className="bi bi-bookmark-plus"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-warning" onClick={() => handleReserve(r)}>
                      <i className="bi bi-pin-angle"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom-0 pt-4 px-4">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0"><i className="bi bi-pin-angle me-2"></i>My Reservations</h6>
            {reservations.length > 0 && <span className="badge bg-secondary">{reservations.length}</span>}
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Book</th>
                <th className="small fw-semibold">Status</th>
                <th className="small fw-semibold">Reserved</th>
                <th className="small fw-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr><td colSpan="4" className="text-center text-muted py-4">No reservations yet.</td></tr>
              ) : reservations.map((r) => (
                <tr key={r._id}>
                  <td className="fw-medium">{r.itemTitle}</td>
                  <td>
                    <span className={`badge ${r.status === 'ready' ? 'bg-success' : 'bg-info'}`}>
                      {r.status === 'ready' ? 'Ready for pickup' : 'Waiting'}
                    </span>
                  </td>
                  <td className="text-muted small">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancelReserve(r)}>
                      <i className="bi bi-x-lg"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BorrowModal show={showBorrowModal} item={borrowItemData} onClose={() => { setShowBorrowModal(false); setBorrowItemData(null); }} onConfirm={confirmBorrow} />
    </div>
  );
}

export default UserDashboard;
