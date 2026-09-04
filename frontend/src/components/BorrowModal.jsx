import { useState, useEffect } from 'react';

const conditions = ['New', 'Good', 'Fair', 'Poor'];

function BorrowModal({ show, item, onClose, onConfirm }) {
  const today = new Date().toISOString().split('T')[0];
  const defaultDue = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  const [form, setForm] = useState({
    borrowerName: '',
    borrowDate: today,
    dueDate: defaultDue,
    condition: 'Good',
    notes: ''
  });

  useEffect(() => {
    if (show) {
      setForm({
        borrowerName: '',
        borrowDate: today,
        dueDate: defaultDue,
        condition: 'Good',
        notes: ''
      });
    }
  }, [show]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(form);
  };

  if (!show) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold"><i className="bi bi-bookmark-plus me-2"></i>Borrow Item</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <small className="text-muted d-block mb-2">Borrowing: <strong>{item?.title}</strong></small>
                {item?.accessionNumber && <small className="text-muted d-block">Accession No: <strong>{item.accessionNumber}</strong></small>}
              </div>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-medium">Borrower Name *</label>
                  <input name="borrowerName" className="form-control" value={form.borrowerName} onChange={handleChange} required placeholder="Enter borrower name" />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium">Borrow Date *</label>
                  <input type="date" name="borrowDate" className="form-control" value={form.borrowDate} onChange={handleChange} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium">Due Date *</label>
                  <input type="date" name="dueDate" className="form-control" value={form.dueDate} onChange={handleChange} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-medium">Condition</label>
                  <select name="condition" className="form-select" value={form.condition} onChange={handleChange}>
                    {conditions.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-medium">Notes</label>
                  <textarea name="notes" className="form-control" rows="2" placeholder="Optional notes..." value={form.notes} onChange={handleChange}></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top-0">
              <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-check-lg me-1"></i>Confirm Borrow
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default BorrowModal;