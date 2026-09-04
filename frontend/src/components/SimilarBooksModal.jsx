import { useState, useEffect } from 'react';
import { getSimilarItems } from '../api/analytics';

function SimilarBooksModal({ show, item, onClose }) {
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && item) {
      setLoading(true);
      getSimilarItems(item._id)
        .then(setSimilar)
        .catch(() => setSimilar([]))
        .finally(() => setLoading(false));
    }
  }, [show, item]);

  if (!show) return null;

  const simBadge = (s) => {
    const pct = Math.round(s * 100);
    const color = s >= 0.3 ? 'success' : s >= 0.15 ? 'info' : 'secondary';
    return <span className={`badge bg-${color}`}>{pct}% similar</span>;
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content border-0 shadow">
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold"><i className="bi bi-shuffle me-2"></i>Similar Books</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <small className="text-muted d-block mb-3">
              Books semantically similar to: <strong>{item?.title}</strong> — grouped via TF-IDF + cosine similarity
            </small>
            {loading ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : similar.length === 0 ? (
              <div className="text-center p-5 text-muted">
                <i className="bi bi-search fs-1 d-block mb-2"></i>
                <span>No similar books found.</span>
              </div>
            ) : (
              <div className="vstack gap-2">
                {similar.map((s) => (
                  <div key={s._id} className="d-flex align-items-center p-2 border rounded-3">
                    <div className="flex-grow-1 me-3">
                      <div className="fw-medium">{s.title}</div>
                      <div className="text-muted small">
                        {s.accessionNumber && <><span className="badge bg-light text-dark me-1">{s.accessionNumber}</span></>}
                        {s.author} <span className="mx-1">·</span> {s.category} <span className="mx-1">·</span> {s.department}
                      </div>
                    </div>
                    {simBadge(s.similarity)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer border-top-0">
            <button type="button" className="btn btn-light" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimilarBooksModal;