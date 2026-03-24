import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Builds full URL to a screenshot stored on the backend (Render in production)
const imgUrl = (path) => `${API_BASE}/${path}`;

const STATUSES = ['All', 'Paid', 'Pending', 'Unpaid', 'Invalid Screenshot'];

const STATUS_STYLES = {
  Paid:                'bg-green-100 text-green-800 border border-green-200',
  Pending:             'bg-yellow-100 text-yellow-800 border border-yellow-200',
  Unpaid:              'bg-red-100 text-red-800 border border-red-200',
  'Invalid Screenshot':'bg-gray-100 text-gray-700 border border-gray-200',
};

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Expected Amount Setting ───────────────────────────────────────────────────
function ExpectedAmountSetting() {
  const [current, setCurrent] = useState(null);
  const [input,   setInput]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);

  useEffect(() => {
    api.get('/api/admin/settings').then(({ data }) => {
      setCurrent(data.data.expectedAmount);
      setInput(String(data.data.expectedAmount));
    });
  }, []);

  const save = async () => {
    const val = parseInt(input, 10);
    if (!val || val < 1) { setMsg({ type: 'error', text: 'Enter a valid amount.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const { data } = await api.put('/api/admin/settings', { expectedAmount: val });
      setCurrent(data.data.expectedAmount);
      setMsg({ type: 'success', text: `Updated to ₹${data.data.expectedAmount}` });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save.' });
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
      <h2 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">⚙️ Payment Settings</h2>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-500 mb-1">Expected Amount (₹)</label>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 text-sm">₹</span>
            <input type="number" min="1" value={input}
              onChange={e => { setInput(e.target.value); setMsg(null); }}
              onKeyDown={e => e.key === 'Enter' && save()}
              className="field-input w-full text-sm py-1.5" placeholder="500" />
          </div>
        </div>
        <button onClick={save} disabled={saving || input === String(current)}
          className="btn-primary py-1.5 px-4 text-sm whitespace-nowrap">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {current !== null && (
          <span className="text-xs text-gray-400 w-full sm:w-auto">
            Current: <strong className="text-blue-700">₹{current}</strong>
          </span>
        )}
      </div>
      {msg && (
        <p className={`mt-1.5 text-xs font-medium ${msg.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
          {msg.type === 'success' ? '✓ ' : '✗ '}{msg.text}
        </p>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  const colors = {
    blue:   'bg-blue-600',
    green:  'bg-green-600',
    yellow: 'bg-yellow-500',
    red:    'bg-red-600',
    gray:   'bg-gray-500',
  };
  return (
    <div className={`${colors[color]} rounded-lg flex flex-col items-center justify-center text-center py-2 px-1`}>
      <p className="text-white font-bold text-base sm:text-xl leading-none">{value}</p>
      <p className="text-white/80 text-[9px] sm:text-xs uppercase tracking-wide mt-0.5 leading-none">{label}</p>
    </div>
  );
}

// ── Image Modal ───────────────────────────────────────────────────────────────
function ImageModal({ src, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-7 right-0 text-white text-sm">✕ Close</button>
        <img src={src} alt="Payment screenshot" className="w-full rounded-xl shadow-2xl object-contain max-h-[80vh]" />
      </div>
    </div>
  );
}

// ── Status Dropdown ───────────────────────────────────────────────────────────
function StatusDropdown({ currentStatus, submissionId, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const update = async (status) => {
    if (status === currentStatus) { setOpen(false); return; }
    setBusy(true);
    try {
      const { data } = await api.patch(`/api/admin/submissions/${submissionId}/status`, { status });
      if (data.success) onUpdated(submissionId, status);
    } catch { alert('Failed to update status.'); }
    finally { setBusy(false); setOpen(false); }
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen(o => !o)} disabled={busy}
        className={`status-badge cursor-pointer select-none ${STATUS_STYLES[currentStatus] || STATUS_STYLES['Invalid Screenshot']}`}>
        {busy ? '…' : currentStatus}
        <svg className="w-3 h-3 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-max overflow-hidden">
          {['Paid', 'Pending', 'Unpaid', 'Invalid Screenshot'].map(s => (
            <button key={s} onClick={() => update(s)}
              className={`block w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors
                ${s === currentStatus ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mobile submission card ────────────────────────────────────────────────────
function MobileCard({ sub, idx, expanded, onToggle, onStatusUpdated, onViewImage }) {
  return (
    <div className="p-3 border-b border-gray-100 last:border-0">
      {/* Row 1: name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 truncate">{idx + 1}. {sub.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{sub.designation || '—'} · {sub.division || '—'}</p>
        </div>
        <div className="flex-shrink-0">
          <StatusDropdown currentStatus={sub.paymentStatus} submissionId={sub._id} onUpdated={onStatusUpdated} />
        </div>
      </div>

      {/* Row 2: amount + receipt */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-600">
          Amount: <strong className="text-gray-800">{sub.extractedAmount != null ? `₹${sub.extractedAmount}` : '—'}</strong>
          {sub.manualOverride && <span className="text-purple-600 ml-1">(edited)</span>}
        </span>
        {sub.paymentScreenshot && (
          <button onClick={() => onViewImage(imgUrl(sub.paymentScreenshot))}
            className="text-xs text-blue-600 underline">View Receipt</button>
        )}
      </div>

      {/* Row 3: date + expand */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">{fmtDate(sub.submittedAt)}</span>
        <button onClick={onToggle} className="text-xs text-blue-600 underline">
          {expanded ? 'Less ▲' : 'More ▼'}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 bg-gray-50 rounded-lg p-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
          <Row label="Parent's Name"  value={sub.parentsName} />
          <Row label="Religion"       value={sub.religion} />
          <Row label="Caste"          value={sub.caste} />
          <Row label="Marital Status" value={sub.maritalStatus} />
          <Row label="Circle"         value={sub.circle || '—'} />
          <Row label="Education"      value={sub.educationQualifications} />
          <Row label="Address"        value={sub.residenceAddress} span />
          {sub.interests && <Row label="Interests" value={sub.interests} span />}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, span }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-gray-700 leading-snug">{value}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login', { replace: true });
  };

  const [submissions, setSubmissions] = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [imgModal,    setImgModal]    = useState(null);
  const [expandedId,  setExpandedId]  = useState(null);
  const [search,      setSearch]      = useState('');
  const [filterStatus,    setFilterStatus]    = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate,   setFilterEndDate]   = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = {};
      if (filterStatus !== 'All') params.status    = filterStatus;
      if (filterStartDate)        params.startDate = filterStartDate;
      if (filterEndDate)          params.endDate   = filterEndDate;
      const [s, st] = await Promise.all([
        api.get('/api/admin/responses', { params }),
        api.get('/api/admin/stats'),
      ]);
      setSubmissions(s.data.data || []);
      setStats(st.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data.');
    } finally { setLoading(false); }
  }, [filterStatus, filterStartDate, filterEndDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const downloadExcel = useCallback(() => {
    const p = new URLSearchParams();
    if (filterStatus !== 'All') p.set('status',    filterStatus);
    if (filterStartDate)        p.set('startDate', filterStartDate);
    if (filterEndDate)          p.set('endDate',   filterEndDate);
    const base = import.meta.env.VITE_API_URL || '';
    window.open(`${base}/api/admin/download-excel?${p}`, '_blank');
  }, [filterStatus, filterStartDate, filterEndDate]);

  const handleStatusUpdated = useCallback((id, newStatus) => {
    setSubmissions(prev =>
      prev.map(s => s._id === id ? { ...s, paymentStatus: newStatus, manualOverride: true } : s)
    );
  }, []);

  const displayed = submissions.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name?.toLowerCase().includes(q) ||
           s.designation?.toLowerCase().includes(q) ||
           s.division?.toLowerCase().includes(q) ||
           s.circle?.toLowerCase().includes(q) ||
           s.residenceAddress?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-md">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold truncate">TCTS — Admin Panel</h1>
            <p className="text-blue-200 text-xs hidden sm:block truncate">
              Telangana Commercial Taxes S.C./S.T. Employees Association
            </p>
            {adminUser?.name && (
              <p className="text-blue-300 text-xs sm:hidden truncate">👤 {adminUser.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {adminUser?.name && (
              <span className="text-blue-200 text-xs hidden sm:block">👤 {adminUser.name}</span>
            )}
            <button onClick={downloadExcel}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-colors shadow whitespace-nowrap">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Download </span>Excel
            </button>
            <button onClick={logout}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-3">

        {/* Stats — always 5 columns, compact on mobile */}
        {stats && (
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            <StatCard label="Total"   value={stats.total}   color="blue"   />
            <StatCard label="Paid"    value={stats.paid}    color="green"  />
            <StatCard label="Pending" value={stats.pending} color="yellow" />
            <StatCard label="Unpaid"  value={stats.unpaid}  color="red"    />
            <StatCard label="Invalid" value={stats.invalid} color="gray"   />
          </div>
        )}

        {/* Settings */}
        <ExpectedAmountSetting />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4">
          <h2 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Filters</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="field-input text-xs py-1.5">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">From Date</label>
              <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}
                className="field-input text-xs py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To Date</label>
              <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}
                className="field-input text-xs py-1.5" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name, Division…" className="field-input text-xs py-1.5" />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={fetchData} className="btn-primary py-1.5 px-4 text-xs">Apply</button>
            <button onClick={() => { setFilterStatus('All'); setFilterStartDate(''); setFilterEndDate(''); setSearch(''); }}
              className="btn-secondary py-1.5 px-4 text-xs">Reset</button>
          </div>
        </div>

        {/* Submissions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 sm:px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-700">
              Submissions
              {!loading && (
                <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                  {displayed.length}{displayed.length !== submissions.length && ` / ${submissions.length}`}
                </span>
              )}
            </h2>
            <button onClick={fetchData} className="text-xs text-blue-600 flex items-center gap-1">
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0120 15M19.418 15A8 8 0 014 9" />
              </svg>
              Refresh
            </button>
          </div>

          {error && <div className="px-4 py-3 text-xs text-red-700 bg-red-50 border-b border-red-100">{error}</div>}

          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              <svg className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              Loading…
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No submissions found.</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {displayed.map((sub, idx) => (
                  <MobileCard key={sub._id} sub={sub} idx={idx}
                    expanded={expandedId === sub._id}
                    onToggle={() => setExpandedId(id => id === sub._id ? null : sub._id)}
                    onStatusUpdated={handleStatusUpdated}
                    onViewImage={setImgModal} />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-left">
                      {['#','Name',"Parent's",'Religion/Caste','Status','Designation','Division/Circle',
                        'Education','Address','Amount','Payment','Receipt','Date',''].map(h => (
                        <th key={h} className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayed.map((sub, idx) => (
                      <>
                        <tr key={sub._id}
                          className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${expandedId === sub._id ? 'bg-blue-50/50' : ''}`}
                          onClick={() => setExpandedId(id => id === sub._id ? null : sub._id)}>
                          <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{sub.name}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{sub.parentsName}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{sub.religion} / {sub.caste}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{sub.maritalStatus}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{sub.designation || '—'}</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                            {sub.division || '—'}{sub.circle && <span className="text-gray-400"> / {sub.circle}</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-600 max-w-[110px] truncate">{sub.educationQualifications}</td>
                          <td className="px-3 py-2 text-gray-600 max-w-[130px] truncate">{sub.residenceAddress}</td>
                          <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                            {sub.extractedAmount != null ? `₹${sub.extractedAmount}` : '—'}
                          </td>
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <StatusDropdown currentStatus={sub.paymentStatus} submissionId={sub._id} onUpdated={handleStatusUpdated} />
                            {sub.manualOverride && <span className="ml-1 text-[10px] text-purple-600">(e)</span>}
                          </td>
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            {sub.paymentScreenshot
                              ? <button onClick={() => setImgModal(imgUrl(sub.paymentScreenshot))} className="text-blue-600 text-xs underline">View</button>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fmtDate(sub.submittedAt)}</td>
                          <td className="px-3 py-2">
                            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedId === sub._id ? 'rotate-180' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </td>
                        </tr>
                        {expandedId === sub._id && (
                          <tr key={`${sub._id}-exp`} className="bg-blue-50/30">
                            <td colSpan={14} className="px-4 py-3">
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <Detail label="Interests" value={sub.interests || '—'} />
                                <Detail label="Full Address" value={sub.residenceAddress} />
                                <Detail label="OCR Text" value={sub.ocrText ? sub.ocrText.substring(0, 200) + '…' : 'N/A'} mono />
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

      </main>

      {imgModal && <ImageModal src={imgModal} onClose={() => setImgModal(null)} />}
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-gray-700 text-xs leading-relaxed ${mono ? 'font-mono bg-gray-100 p-1.5 rounded text-[10px]' : ''}`}>{value}</p>
    </div>
  );
}
