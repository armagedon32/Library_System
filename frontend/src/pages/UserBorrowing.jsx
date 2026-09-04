import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyUsage, returnItem, borrowItem, getCollectionItems, reserveItem } from '../api/analytics';
import BorrowModal from '../components/BorrowModal';
import ReturnModal from '../components/ReturnModal';
import { useToast } from '../components/Toast';

function UserBorrowing() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableItems, setAvailableItems] = useState([]);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowItemData, setBorrowItemData] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnRecord, setReturnRecord] = useState(null);
  const [bookSearch, setBookSearch] = useState('');

  useEffect(() => {
    loadData();
    getCollectionItems({ status: 'Active', limit: 100 }).then(d => setAvailableItems(d.items || [])).catch(() => {});
  }, []);

  const loadData = () => {
    setLoading(true);
    getMyUsage().then(setData).catch(console.error).finally(() => setLoading(false));
  };

  const handleReturn = (record) => {
    setReturnRecord(record);
    setShowReturnModal(true);
  };

  const confirmReturn = async (form) => {
    try {
      const itemId = returnRecord.collectionItem?._id || returnRecord.itemId;
      const res = await returnItem(itemId, form);
      addToast(res.message, 'success');
      setShowReturnModal(false);
      setReturnRecord(null);
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to return', 'danger');
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
      getCollectionItems({ status: 'Active', limit: 100 }).then(d => setAvailableItems(d.items || [])).catch(() => {});
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to borrow', 'danger');
    }
  };

  const handleReserve = async (item) => {
    try {
      await reserveItem(item._id);
      addToast(`"${item.title}" reserved successfully!`, 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reserve', 'danger');
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
        <h4 className="fw-bold mb-1"><i className="bi bi-bookmark-check me-2"></i>Borrowing</h4>
        <p className="text-muted small mb-0">Manage your current loans, browse the catalog to borrow, and view your history</p>
      </div>

      <div className="row g-3 mb-4">
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
                  <p className="text-muted small fw-medium mb-1">Available Books</p>
                  <h3 className="fw-bold mb-0">{availableItems.filter(i => i.copies > 0).length}</h3>
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
                  <p className="text-muted small fw-medium mb-1">Total Borrowed</p>
                  <h3 className="fw-bold mb-0">{data?.stats?.totalBorrowed || 0}</h3>
                </div>
                <div className="bg-info bg-opacity-10 rounded-3 p-3">
                  <i className="bi bi-journal-check text-info fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {data?.records?.filter(r => !r.isReturned).length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white border-bottom-0 pt-4 px-4">
            <h6 className="fw-bold mb-0"><i className="bi bi-bookmark-check me-2"></i>Currently Borrowed</h6>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small fw-semibold">Accession No.</th>
                  <th className="small fw-semibold">Title</th>
                  <th className="small fw-semibold">Author</th>
                  <th className="small fw-semibold">Borrow Date</th>
                  <th className="small fw-semibold">Due Date</th>
                  <th className="small fw-semibold">Status</th>
                  <th className="small fw-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {data?.records?.filter(r => !r.isReturned).map((record) => (
                  <tr key={record._id}>
                    <td className="text-muted small fw-medium">{record.collectionItem?.accessionNumber || '-'}</td>
                    <td className="fw-medium">{record.collectionItem?.title || 'Unknown'}</td>
                    <td className="text-muted">{record.collectionItem?.author || 'Unknown'}</td>
                    <td className="text-muted">{new Date(record.borrowDate).toLocaleDateString()}</td>
                    <td className="text-muted">{new Date(record.dueDate).toLocaleDateString()}</td>
                    <td>
                      {record.isOverdue ? (
                        <span className="badge bg-danger">Overdue</span>
                      ) : (
                        <span className="badge bg-warning text-dark">Borrowed</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-success" onClick={() => handleReturn(record)}>
                        <i className="bi bi-arrow-return-left me-1"></i>Return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom-0 pt-4 px-4">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0"><i className="bi bi-book me-2"></i>Available Books</h6>
            <div className="input-group input-group-sm" style={{ width: '250px' }}>
              <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
              <input className="form-control" placeholder="Search by title or author..." value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="small fw-semibold">Accession No.</th>
                <th className="small fw-semibold">Title</th>
                <th className="small fw-semibold">Author</th>
                <th className="small fw-semibold">Category</th>
                <th className="small fw-semibold">Copies</th>
                <th className="small fw-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {availableItems.filter(i => i.copies > 0 && (!bookSearch || i.title.toLowerCase().includes(bookSearch.toLowerCase()) || i.author.toLowerCase().includes(bookSearch.toLowerCase()))).slice(0, 20).map((item) => (
                <tr key={item._id}>
                  <td className="text-muted small fw-medium">{item.accessionNumber || '-'}</td>
                  <td className="fw-medium">{item.title}</td>
                  <td className="text-muted">{item.author}</td>
                  <td className="text-muted">{item.category}</td>
                  <td><span className="badge bg-info">{item.copies}</span></td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openBorrowForm(item)}>
                      <i className="bi bi-bookmark-plus me-1"></i>Borrow
                    </button>
                    <button className="btn btn-sm btn-outline-warning" onClick={() => handleReserve(item)}>
                      <i className="bi bi-pin-angle me-1"></i>Reserve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom-0 pt-4 px-4">
          <h6 className="fw-bold mb-0"><i className="bi bi-clock-history me-2"></i>My Borrowing History</h6>
        </div>
        <div className="card-body p-4">
          {data?.records?.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-journal text-muted" style={{ fontSize: '3rem' }}></i>
              <p className="text-muted mt-3 mb-0">Wala ka pang na-borrow na items.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="small fw-semibold">Title</th>
                    <th className="small fw-semibold">Author</th>
                    <th className="small fw-semibold">Borrow Date</th>
                    <th className="small fw-semibold">Due Date</th>
                    <th className="small fw-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.records?.map((record) => (
                    <tr key={record._id}>
                      <td className="fw-medium">{record.collectionItem?.title || 'Unknown'}</td>
                      <td className="text-muted">{record.collectionItem?.author || 'Unknown'}</td>
                      <td className="text-muted">{new Date(record.borrowDate).toLocaleDateString()}</td>
                      <td className="text-muted">{new Date(record.dueDate).toLocaleDateString()}</td>
                      <td>
                        {!record.isReturned && record.isOverdue ? (
                          <span className="badge bg-danger">Overdue</span>
                        ) : !record.isReturned ? (
                          <span className="badge bg-warning text-dark">Borrowed</span>
                        ) : (
                          <span className="badge bg-success">Returned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <BorrowModal show={showBorrowModal} item={borrowItemData} onClose={() => { setShowBorrowModal(false); setBorrowItemData(null); }} onConfirm={confirmBorrow} />
      <ReturnModal show={showReturnModal} record={returnRecord} onClose={() => { setShowReturnModal(false); setReturnRecord(null); }} onConfirm={confirmReturn} />
    </div>
  );
}

export default UserBorrowing;