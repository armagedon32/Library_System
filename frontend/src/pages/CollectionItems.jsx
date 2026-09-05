import { useState, useEffect, useRef } from 'react';
import { getCollectionItems, borrowItem, downloadItemsCsv, uploadItemsCsv } from '../api/analytics';
import AddItemModal from '../components/AddItemModal';
import BorrowModal from '../components/BorrowModal';
import SimilarBooksModal from '../components/SimilarBooksModal';
import { useToast } from '../components/Toast';

function CollectionItems() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ department: '', category: '', status: '', publishYear: '' });
  const [showModal, setShowModal] = useState(false);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowItemData, setBorrowItemData] = useState(null);
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [similarItemData, setSimilarItemData] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadItems();
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, filters.department, filters.category, filters.status, filters.publishYear, currentPage]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = { ...filters, search, page: currentPage, limit: 10 };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const data = await getCollectionItems(params);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    addToast('Item added successfully!', 'success');
    loadItems();
  };

  const openBorrowForm = (item) => {
    setBorrowItemData(item);
    setShowBorrowModal(true);
  };

  const openSimilar = (item) => {
    setSimilarItemData(item);
    setShowSimilarModal(true);
  };

  const confirmBorrow = async (form) => {
    try {
      await borrowItem(borrowItemData._id, form);
      addToast(`Borrowed "${borrowItemData.title}" successfully!`, 'success');
      setShowBorrowModal(false);
      setBorrowItemData(null);
      loadItems();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to borrow', 'danger');
    }
  };

  const handleDownload = async () => {
    try {
      const data = await downloadItemsCsv();
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'library_items.csv';
      a.click();
      URL.revokeObjectURL(url);
      addToast(`Downloaded ${data.count} items`, 'success');
    } catch (err) {
      addToast('Failed to download', 'danger');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadItemsCsv(file);
      const msg = result.message + (result.totalErrors ? ` (${result.totalErrors} errors)` : '');
      addToast(msg, result.totalErrors ? 'warning' : 'success');
      loadItems();
    } catch (err) {
      addToast(err.response?.data?.message || 'Upload failed', 'danger');
    }
    e.target.value = '';
  };

  const statusBadge = (status) => {
    const map = {
      'Active': 'bg-success',
      'Flagged for Review': 'bg-warning text-dark',
      'Recommend Retire': 'bg-danger',
      'Recommend Keep': 'bg-primary'
    };
    return map[status] || 'bg-secondary';
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="text-center p-5 text-muted">
          <i className="bi bi-book fs-1 d-block mb-2"></i>
          <span>No items found</span>
        </div>
      );
    }
    return (
      <div>
        {viewMode === 'list' ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="small fw-semibold">Accession No.</th>
                  <th className="small fw-semibold">Title</th>
                  <th className="small fw-semibold">Author</th>
                  <th className="small fw-semibold">ISBN</th>
                  <th className="small fw-semibold">Year</th>
                  <th className="small fw-semibold">Publisher</th>
                  <th className="small fw-semibold">Category</th>
                  <th className="small fw-semibold">Department</th>
                  <th className="small fw-semibold">Status</th>
                  <th className="small fw-semibold">Borrows</th>
                  <th className="small fw-semibold">Usage Score</th>
                  <th className="small fw-semibold">Cluster</th>
                  <th className="small fw-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td className="text-muted small fw-medium">{item.accessionNumber || '-'}</td>
                    <td className="fw-medium">{item.title}</td>
                    <td className="text-muted">{item.author}</td>
                    <td className="text-muted small">{item.isbn}</td>
                    <td className="text-muted">{item.publishYear}</td>
                    <td className="text-muted">{item.publisher}</td>
                    <td className="text-muted">{item.category}</td>
                    <td className="text-muted">{item.department}</td>
                    <td><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></td>
                    <td>{item.usageMetrics.totalBorrows}</td>
                    <td>{item.usageMetrics.usageScore.toFixed(2)}</td>
                    <td>{item.cluster === -2 ? <span className="badge bg-secondary">New</span> : (item.cluster === -1 ? <span className="badge bg-warning text-dark">Not Yet Clustered</span> : <span className="badge bg-success">Clustered</span>)}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openBorrowForm(item)}
                        disabled={item.copies < 1} title={item.copies < 1 ? 'No copies available' : 'Borrow this item'}>
                        <i className="bi bi-bookmark-plus"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-secondary ms-1 me-1" onClick={() => openSimilar(item)}
                        title="View similar books">
                        <i className="bi bi-shuffle"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="row g-3">
            {items.map((item) => (
              <div key={item._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <div className="card border-0 shadow-sm h-100">
                  <div className="bg-light text-center p-4" style={{ minHeight: '180px', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="img-fluid" style={{ maxHeight: '160px' }} />
                    ) : (
                      <i className="bi bi-book fs-1 text-muted"></i>
                    )}
                  </div>
                  <div className="card-body p-3">
                    <h6 className="fw-bold mb-1 text-truncate" title={item.title}>{item.title}</h6>
                    <small className="text-muted d-block mb-1">{item.author}</small>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      <span className="badge bg-light text-dark">{item.department}</span>
                      <span className="badge bg-light text-dark">{item.category}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">{item.accessionNumber || '-'}</small>
                      <span className={`badge ${statusBadge(item.status)}`}>{item.status}</span>
                    </div>
                    <div className="d-flex gap-1 mt-2">
                      <button className="btn btn-sm btn-outline-primary flex-fill" onClick={() => openBorrowForm(item)}
                        disabled={item.copies < 1} title={item.copies < 1 ? 'No copies available' : 'Borrow'}>
                        <i className="bi bi-bookmark-plus"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => openSimilar(item)} title="Similar">
                        <i className="bi bi-shuffle"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Collection Items <span className="badge bg-primary fs-6">{total}</span></h4>
          <p className="text-muted small mb-0">Manage and monitor library collection performance</p>
        </div>
        <button className="btn btn-dark btn-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-1"></i>Add Item
        </button>
        <div className="d-flex gap-2">
          <div className="btn-group btn-group-sm" role="group">
            <button type="button" className={`btn ${viewMode === 'list' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setViewMode('list')}>
              <i className="bi bi-list-ul"></i>
            </button>
            <button type="button" className={`btn ${viewMode === 'grid' ? 'btn-dark' : 'btn-outline-dark'}`} onClick={() => setViewMode('grid')}>
              <i className="bi bi-grid-3x3-gap-fill"></i>
            </button>
          </div>
          <label className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-upload me-1"></i>Upload CSV
            <input type="file" accept=".csv" className="d-none" onChange={handleUpload} />
          </label>
          <button className="btn btn-outline-primary btn-sm" onClick={handleDownload}>
            <i className="bi bi-download me-1"></i>Download CSV
          </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-12 col-md-3">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input className="form-control" placeholder="Search title or author..." value={search}
                  onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="col">
              <select className="form-select form-select-sm" value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
                <option value="">All Departments</option>
                <option value="Education">Education</option>
                <option value="BSBA">BSBA</option>
                <option value="BSHM">BSHM</option>
                <option value="Computer Science">Computer Science</option>
              </select>
            </div>
            <div className="col">
              <select className="form-select form-select-sm" value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">All Categories</option>
                <option value="Monograph">Monograph</option>
                <option value="Reference">Reference</option>
                <option value="Periodical">Periodical</option>
                <option value="Thesis">Thesis</option>
                <option value="Technical Report">Technical Report</option>
                <option value="Conference Paper">Conference Paper</option>
              </select>
            </div>
            <div className="col">
              <select className="form-select form-select-sm" value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Flagged for Review">Flagged</option>
                <option value="Recommend Retire">Retire</option>
                <option value="Recommend Keep">Keep</option>
              </select>
            </div>
            <div className="col">
              <select className="form-select form-select-sm" value={filters.publishYear}
                onChange={(e) => setFilters({ ...filters, publishYear: e.target.value })}>
                <option value="">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        {loading ? (
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center p-5 text-muted">
            <i className="bi bi-book fs-1 d-block mb-2"></i>
            <span>No items found</span>
          </div>
        ) : (
          <div>
            {viewMode === 'list' ? (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="small fw-semibold">Accession No.</th>
                      <th className="small fw-semibold">Title</th>
                      <th className="small fw-semibold">Author</th>
                      <th className="small fw-semibold">ISBN</th>
                      <th className="small fw-semibold">Year</th>
                      <th className="small fw-semibold">Publisher</th>
                      <th className="small fw-semibold">Category</th>
                      <th className="small fw-semibold">Department</th>
                      <th className="small fw-semibold">Status</th>
                      <th className="small fw-semibold">Borrows</th>
                      <th className="small fw-semibold">Usage Score</th>
                      <th className="small fw-semibold">Cluster No.</th>
                      <th className="small fw-semibold">Cluster</th>
                      <th className="small fw-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item._id}>
                        <td className="text-muted small fw-medium">{item.accessionNumber || '-'}</td>
                        <td className="fw-medium">{item.title}</td>
                        <td className="text-muted">{item.author}</td>
                        <td className="text-muted small">{item.isbn}</td>
                        <td className="text-muted">{item.publishYear}</td>
                        <td className="text-muted">{item.publisher}</td>
                        <td className="text-muted">{item.category}</td>
                        <td className="text-muted">{item.department}</td>
                        <td><span className={`badge ${statusBadge(item.status)}`}>{item.status}</span></td>
                        <td>{item.usageMetrics.totalBorrows}</td>
                        <td>{item.usageMetrics.usageScore.toFixed(2)}</td>
                        <td className="text-center fw-medium">{item.cluster >= 0 ? item.cluster : '-'}</td>
                        <td>{item.cluster === -2 ? <span className="badge bg-secondary">New</span> : (item.cluster === -1 ? <span className="badge bg-warning text-dark">Not Yet Clustered</span> : <span className="badge bg-success">Clustered</span>)}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openBorrowForm(item)}
                            disabled={item.copies < 1} title={item.copies < 1 ? 'No copies available' : 'Borrow this item'}>
                            <i className="bi bi-bookmark-plus"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-secondary ms-1 me-1" onClick={() => openSimilar(item)}
                            title="View similar books">
                            <i className="bi bi-shuffle"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="row g-3">
                {items.map((item) => (
                  <div key={item._id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="bg-light text-center p-4" style={{ minHeight: '180px', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        {item.coverImage ? (
                          <img src={item.coverImage} alt={item.title} className="img-fluid" style={{ maxHeight: '160px' }} />
                        ) : (
                          <i className="bi bi-book fs-1 text-muted"></i>
                        )}
                      </div>
                      <div className="card-body p-3">
                        <h6 className="fw-bold mb-1 text-truncate" title={item.title}>{item.title}</h6>
                        <small className="text-muted d-block mb-1">{item.author}</small>
                        <div className="d-flex flex-wrap gap-1 mb-2">
                          <span className="badge bg-light text-dark">{item.department}</span>
                          <span className="badge bg-light text-dark">{item.category}</span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">{item.accessionNumber || '-'}</small>
                          <span className={`badge ${statusBadge(item.status)}`}>{item.status}</span>
                        </div>
                        <div className="d-flex gap-1 mt-2">
                          <button className="btn btn-sm btn-outline-primary flex-fill" onClick={() => openBorrowForm(item)}
                            disabled={item.copies < 1} title={item.copies < 1 ? 'No copies available' : 'Borrow'}>
                            <i className="bi bi-bookmark-plus"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => openSimilar(item)} title="Similar">
                            <i className="bi bi-shuffle"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="card-footer bg-white border-top-0">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, total)} of {total} items
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

      <BorrowModal show={showBorrowModal} item={borrowItemData} onClose={() => { setShowBorrowModal(false); setBorrowItemData(null); }} onConfirm={confirmBorrow} />
      <SimilarBooksModal show={showSimilarModal} item={similarItemData}
        onClose={() => { setShowSimilarModal(false); setSimilarItemData(null); }} />
      <AddItemModal show={showModal} onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
    </div>
  );
}

export default CollectionItems;