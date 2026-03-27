import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const API_BASE = import.meta.env.VITE_API_URL || '';
const imgUrl   = (p) => `${API_BASE}/${p}`;

const STATUSES = ['All', 'Paid', 'Paid (Verification Required)', 'Pending', 'Unpaid', 'Invalid Screenshot'];

const STATUS_STYLES = {
  'Paid':                         'bg-green-100 text-green-800 border border-green-200',
  'Paid (Verification Required)': 'bg-blue-100 text-blue-800 border border-blue-200',
  'Pending':                      'bg-yellow-100 text-yellow-800 border border-yellow-200',
  'Unpaid':                       'bg-red-100 text-red-800 border border-red-200',
  'Invalid Screenshot':           'bg-gray-100 text-gray-700 border border-gray-200',
};

const fmtDate = (iso) => new Date(iso).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

// ── Settings ──────────────────────────────────────────────────────────────────
function ExpectedAmountSetting() {
  const [current, setCurrent] = useState(null);
  const [input,   setInput]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);

  useEffect(() => {
    api.get('/api/admin/settings').then(({ data }) => {
      setCurrent(data.data.expectedAmount);
      setInput(String(data.data.expectedAmount));
    }).catch(() => {});
  }, []);

  const save = async () => {
    const val = parseInt(input, 10);
    if (!val || val < 1) { setMsg({ ok: false, text: 'Enter a valid amount.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const { data } = await api.put('/api/admin/settings', { expectedAmount: val });
      setCurrent(data.data.expectedAmount);
      setMsg({ ok: true, text: `Updated to ₹${data.data.expectedAmount}` });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Failed.' });
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4">
      <h2 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">⚙️ Payment Settings</h2>
      <div className="flex flex-wrap items-end gap-2 md:gap-3">
        <div>
          <label className="field-label">Expected Amount (₹)</label>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-semibold text-sm">₹</span>
            <input type="number" min="1" value={input}
              onChange={e => { setInput(e.target.value); setMsg(null); }}
              onKeyDown={e => e.key === 'Enter' && save()}
              className="field-input w-24 md:w-32 text-sm py-1.5"
              placeholder="500" />
          </div>
        </div>
        <button onClick={save} disabled={saving || input === String(current)}
          className="btn-primary py-1.5 px-4 text-sm">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {current !== null && (
          <span className="text-xs text-gray-500">
            Current: <strong className="text-blue-700">₹{current}</strong>
          </span>
        )}
      </div>
      {msg && (
        <p className={`mt-1.5 text-xs font-medium ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>
          {msg.ok ? '✓ ' : '✗ '}{msg.text}
        </p>
      )}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  const bg = { blue:'bg-blue-600', green:'bg-green-600', yellow:'bg-yellow-500', red:'bg-red-600', gray:'bg-gray-500', indigo:'bg-indigo-600' };
  return (
    <div className={`${bg[color]} rounded-lg md:rounded-xl py-2 px-1 md:p-3 flex flex-col items-center justify-center text-center`}>
      <p className="text-white font-bold text-base md:text-2xl leading-none">{value}</p>
      <p className="text-white/80 text-[9px] md:text-xs uppercase tracking-wide mt-0.5 leading-none">{label}</p>
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
      <div className="relative max-w-sm md:max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-8 right-0 text-white text-sm font-medium">✕ Close</button>
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

  const update = async (s) => {
    if (s === currentStatus) { setOpen(false); return; }
    setBusy(true);
    try {
      const { data } = await api.patch(`/api/admin/submissions/${submissionId}/status`, { status: s });
      if (data.success) onUpdated(submissionId, s);
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
        <div className="absolute z-30 mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-max overflow-hidden">
          {['Paid','Paid (Verification Required)','Pending','Unpaid','Invalid Screenshot'].map(s => (
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

// ── Mobile Card ───────────────────────────────────────────────────────────────
function MobileCard({ sub, idx, expanded, onToggle, onStatusUpdated, onViewImage }) {
  return (
    <div className="p-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 truncate">{idx + 1}. {sub.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {sub.designation || '—'} · {sub.division || '—'}
          </p>
        </div>
        <div className="flex-shrink-0">
          <StatusDropdown currentStatus={sub.paymentStatus} submissionId={sub._id} onUpdated={onStatusUpdated} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">
          Amount: <strong>{sub.extractedAmount != null ? `₹${sub.extractedAmount}` : '—'}</strong>
          {sub.manualOverride && <span className="text-purple-600 ml-1 text-[10px]">(edited)</span>}
        </span>
        {sub.transactionId && (
          <span className="text-xs text-gray-500 font-mono">Txn: {sub.transactionId}</span>
        )}
        <div className="flex items-center gap-3">
          {sub.paymentScreenshot && (
            <button onClick={() => onViewImage(imgUrl(sub.paymentScreenshot))}
              className="text-xs text-blue-600 underline">Receipt</button>
          )}
          <button onClick={onToggle} className="text-xs text-blue-600 underline">
            {expanded ? 'Less ▲' : 'More ▼'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-1">{fmtDate(sub.submittedAt)}</p>

      {expanded && (
        <div className="mt-2 bg-gray-50 rounded-lg p-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
          <KV label="Parent's Name"  v={sub.parentsName} />
          <KV label="Religion/Caste" v={`${sub.religion} / ${sub.caste}`} />
          <KV label="Marital Status" v={sub.maritalStatus} />
          <KV label="Circle"         v={sub.circle || '—'} />
          <KV label="Education"      v={sub.educationQualifications} />
          <KV label="Address"        v={sub.residenceAddress} full />
          {sub.interests && <KV label="Interests" v={sub.interests} full />}
        </div>
      )}
    </div>
  );
}

function KV({ label, v, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-gray-700 leading-snug break-words">{v}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate  = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login', { replace: true });
  };

  const [submissions,     setSubmissions]     = useState([]);
  const [stats,           setStats]           = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [imgModal,        setImgModal]        = useState(null);
  const [expandedId,      setExpandedId]      = useState(null);
  const [search,          setSearch]          = useState('');
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

  const downloadExcel = () => {
    const p = new URLSearchParams();
    if (filterStatus !== 'All') p.set('status',    filterStatus);
    if (filterStartDate)        p.set('startDate', filterStartDate);
    if (filterEndDate)          p.set('endDate',   filterEndDate);
    window.open(`${API_BASE}/api/admin/download-excel?${p}`, '_blank');
  };

  const handleStatusUpdated = useCallback((id, status) => {
    setSubmissions(prev => prev.map(s => s._id === id ? { ...s, paymentStatus: status, manualOverride: true } : s));
  }, []);

  const displayed = submissions.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ['name','designation','division','circle','residenceAddress']
      .some(k => s[k]?.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-md">
        <div className="max-w-screen-xl mx-auto px-3 md:px-6 py-3 md:py-4">

          {/* Mobile layout: stacked */}
          <div className="flex flex-col gap-2 md:hidden">
            <div>
              <h1 className="text-sm font-bold leading-tight">TCTS Association — Admin Panel</h1>
              {adminUser?.name && <p className="text-blue-200 text-xs">👤 {adminUser.name}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={downloadExcel}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-semibold text-xs py-2 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel
              </button>
              <button onClick={logout}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs py-2 px-3 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>

          {/* Desktop layout: single row (original) */}
          <div className="hidden md:flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold leading-tight">TCTS Association — Admin Panel</h1>
              <p className="text-blue-200 text-xs">Telangana Commercial Taxes S.C./S.T. Employees Association</p>
            </div>
            <div className="flex items-center gap-3">
              {adminUser?.name && <span className="text-blue-200 text-sm">👤 {adminUser.name}</span>}
              <button onClick={downloadExcel}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shadow">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
                </svg>
                Download Excel
              </button>
              <button onClick={logout}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm px-4 py-2.5 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>

        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-3 md:px-6 py-3 md:py-6 space-y-3 md:space-y-5">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 md:gap-3">
            <StatCard label="Total"    value={stats.total}      color="blue"   />
            <StatCard label="Paid"     value={stats.paid}       color="green"  />
            <StatCard label="Verify"   value={stats.paidVerify} color="indigo" />
            <StatCard label="Pending"  value={stats.pending}    color="yellow" />
            <StatCard label="Unpaid"   value={stats.unpaid}     color="red"    />
            <StatCard label="Invalid"  value={stats.invalid}    color="gray"   />
          </div>
        )}

        {/* Settings */}
        <ExpectedAmountSetting />

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4">
          <h2 className="text-xs md:text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Filters</h2>

          {/* Mobile: stacked */}
          <div className="grid grid-cols-1 gap-2 md:hidden">
            <div>
              <label className="field-label">Search</label>
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name, Designation, Division…" className="field-input text-sm py-2" />
            </div>
            <div>
              <label className="field-label">Payment Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="field-input text-sm py-2">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">From Date</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}
                  className="field-input text-sm py-2" />
              </div>
              <div>
                <label className="field-label">To Date</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}
                  className="field-input text-sm py-2" />
              </div>
            </div>
          </div>

          {/* Desktop: 4 columns (original) */}
          <div className="hidden md:grid md:grid-cols-4 gap-3">
            <div>
              <label className="field-label">Payment Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="field-input text-sm py-2">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">From Date</label>
              <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}
                className="field-input text-sm py-2" />
            </div>
            <div>
              <label className="field-label">To Date</label>
              <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}
                className="field-input text-sm py-2" />
            </div>
            <div>
              <label className="field-label">Search</label>
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name, Designation, Division…" className="field-input text-sm py-2" />
            </div>
          </div>

          <div className="flex gap-2 mt-2.5">
            <button onClick={fetchData} className="btn-primary py-2 px-4 text-sm">Apply</button>
            <button onClick={() => { setFilterStatus('All'); setFilterStartDate(''); setFilterEndDate(''); setSearch(''); }}
              className="btn-secondary py-2 px-4 text-sm">Reset</button>
          </div>
        </div>

        {/* Submissions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 md:px-5 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xs md:text-sm font-semibold text-gray-700">
              Submissions
              {!loading && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-normal">
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

          {error && <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>}

          {loading ? (
            <div className="py-14 text-center">
              <svg className="w-7 h-7 animate-spin mx-auto mb-3 text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              <p className="text-sm text-gray-400">Loading submissions…</p>
            </div>
          ) : displayed.length === 0 ? (
            <div className="py-14 text-center text-gray-400 text-sm">No submissions found.</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {displayed.map((sub, idx) => (
                  <MobileCard key={sub._id} sub={sub} idx={idx}
                    expanded={expandedId === sub._id}
                    onToggle={() => setExpandedId(id => id === sub._id ? null : sub._id)}
                    onStatusUpdated={handleStatusUpdated}
                    onViewImage={setImgModal} />
                ))}
              </div>

              {/* Desktop table (original) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-left">
                      {['#','Name',"Parent's Name",'Religion / Caste','Marital Status',
                        'Designation','Division / Circle','Education','Address',
                        'Txn ID / UTR','Amount (₹)','Status','Screenshot','Date',''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayed.map((sub, idx) => (
                      <>
                        <tr key={sub._id}
                          className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${expandedId === sub._id ? 'bg-blue-50/60' : ''}`}
                          onClick={() => setExpandedId(id => id === sub._id ? null : sub._id)}>
                          <td className="px-3 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{sub.name}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{sub.parentsName}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{sub.religion} / {sub.caste}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{sub.maritalStatus}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{sub.designation || '—'}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                            {sub.division || '—'}{sub.circle && <span className="text-gray-400"> / {sub.circle}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-gray-600 max-w-[130px] truncate">{sub.educationQualifications}</td>
                          <td className="px-3 py-2.5 text-gray-600 max-w-[150px] truncate">{sub.residenceAddress}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap font-mono text-xs">
                            {sub.transactionId || '—'}
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">
                            {sub.extractedAmount != null ? `₹${sub.extractedAmount}` : '—'}
                          </td>
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <StatusDropdown currentStatus={sub.paymentStatus} submissionId={sub._id} onUpdated={handleStatusUpdated} />
                            {sub.manualOverride && <span className="ml-1 text-[10px] text-purple-600">(edited)</span>}
                          </td>
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            {sub.paymentScreenshot
                              ? <button onClick={() => setImgModal(imgUrl(sub.paymentScreenshot))} className="text-blue-600 hover:text-blue-800 text-xs underline font-medium">View</button>
                              : <span className="text-gray-400 text-xs">None</span>}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(sub.submittedAt)}</td>
                          <td className="px-3 py-2.5">
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedId === sub._id ? 'rotate-180' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </td>
                        </tr>
                        {expandedId === sub._id && (
                          <tr key={`${sub._id}-detail`} className="bg-blue-50/40">
                            <td colSpan={14} className="px-5 py-3">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <Detail label="Interests / Hobbies" value={sub.interests || '—'} />
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
      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-gray-700 text-xs leading-relaxed ${mono ? 'font-mono bg-gray-100 p-2 rounded text-[11px]' : ''}`}>
        {value}
      </p>
    </div>
  );
}
