import { useState, useCallback, useEffect } from 'react';
import api from '../api';

const INITIAL = {
  name: '', parentsName: '', mobile: '',
  designation: '', division: '', circle: '',
  caste: '',
};

/* Load Cashfree JS SDK from CDN */
function loadCashfreeSDK() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) { resolve(window.Cashfree); return; }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload  = () => window.Cashfree ? resolve(window.Cashfree) : reject(new Error('SDK not available'));
    script.onerror = () => reject(new Error('Failed to load payment SDK. Check your connection.'));
    document.head.appendChild(script);
  });
}

export default function FormPage() {
  const [form,          setForm]          = useState(INITIAL);
  const [errors,        setErrors]        = useState({});
  const [paying,        setPaying]        = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitted,     setSubmitted]     = useState(false);
  const [serverMsg,     setServerMsg]     = useState('');
  const [payError,      setPayError]      = useState('');
  const [payStep,       setPayStep]       = useState('idle'); // idle | creating | checkout
  const [paidOrderId,   setPaidOrderId]   = useState(null);  // set after payment succeeds
  const [amount,        setAmount]        = useState(null);  // fetched from server

  useEffect(() => {
    api.get('/api/membership-amount')
      .then(r => setAmount(r.data.amount))
      .catch(() => setAmount(500));
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
    setPayError('');
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim())        e.name        = 'Required';
    if (!form.mobile.trim())      e.mobile      = 'Required';
    else if (!/^[6-9]\d{9}$/.test(form.mobile.trim()))
                                  e.mobile      = 'Enter a valid 10-digit mobile number';
    if (!form.designation.trim()) e.designation = 'Required';
    if (!form.division.trim())    e.division    = 'Required';
    if (!form.circle.trim())      e.circle      = 'Required';
    return e;
  };

  /* ── Step 1: Pay ── */
  const handlePay = async (e) => {
    e.preventDefault();
    setPayError('');

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setPaying(true);

    try {
      setPayStep('creating');
      const orderRes = await api.post('/api/payment/create-order', {
        name:   form.name.trim(),
        mobile: form.mobile.trim(),
      });
      const { orderId, paymentSessionId } = orderRes.data;

      setPayStep('checkout');
      const CashfreeSDK = await loadCashfreeSDK();
      const cashfree    = CashfreeSDK({ mode: 'production' });

      const result = await cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_modal',
      });

      if (result.error) {
        setPayError(result.error.message || 'Payment was not completed. Please try again.');
        return;
      }

      /* Payment done — unlock Submit button */
      setPaidOrderId(orderId);
      setPayError('');

    } catch (err) {
      const msg = err.response?.data?.message
        || (err.message.includes('SDK') ? err.message : 'Something went wrong. Please try again.');
      const detail = err.response?.data?.errors;
      setPayError(detail?.length ? detail.map(d => d.message).join(' • ') : msg);
    } finally {
      setPaying(false);
      setPayStep('idle');
    }
  };

  /* ── Step 2: Submit ── */
  const handleSubmit = async () => {
    if (!paidOrderId) return;
    setSubmitting(true);
    setPayError('');

    try {
      const { data } = await api.post('/api/submit-form', {
        ...form,
        cashfreeOrderId: paidOrderId,
      });

      setSubmitted(true);
      setServerMsg(
        data.paymentStatus === 'Paid'
          ? `Payment of ₹${displayAmount} verified! Welcome to the Association.`
          : 'Form submitted. Admin will confirm your payment shortly.'
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission failed. Please try again.';
      const detail = err.response?.data?.errors;
      setPayError(detail?.length ? detail.map(d => d.message).join(' • ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Step label ── */
  const stepLabel = {
    idle:     `Pay ₹${displayAmount}`,
    creating: 'Creating order…',
    checkout: 'Opening payment…',
  }[payStep];

  /* ── Success ─────────────────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Submitted Successfully!</h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">{serverMsg}</p>
          <button onClick={() => {
            setSubmitted(false); setForm(INITIAL);
            setErrors({}); setServerMsg(''); setPayError('');
          }} className="btn-primary w-full">Submit Another Response</button>
        </div>
      </div>
    );
  }

  const busy = paying || submitting;
  const paymentDone = !!paidOrderId;
  const displayAmount = amount ?? '…';

  /* ── Form ────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 md:py-8 px-3 md:px-4">

      {/* Header */}
      <div className="max-w-3xl mx-auto mb-4 md:mb-6 rounded-xl overflow-hidden shadow-lg">
        <img src={import.meta.env.BASE_URL + 'header.jpeg'}
          alt="Telangana Commercial Taxes S.C./S.T. Employees Association"
          className="w-full h-auto block" />
      </div>

      {/* Card */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <form onSubmit={handlePay} noValidate>

          {/* Personal Details */}
          <SectionHeader icon="👤" title="Personal Details" />
          <div className="px-3 md:px-6 py-3 md:py-5 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
            <F label="Full Name" required error={errors.name}>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="Enter your full name" disabled={busy}
                className={`field-input ${errors.name ? 'field-input-error' : ''}`} />
            </F>
            <F label="Parent's Name" error={errors.parentsName}>
              <input type="text" name="parentsName" value={form.parentsName} onChange={handleChange}
                placeholder="Father's / Mother's name" disabled={busy}
                className="field-input" />
            </F>
            <F label="Mobile Number" required error={errors.mobile}>
              <input type="tel" name="mobile" value={form.mobile} onChange={handleChange}
                placeholder="10-digit mobile number" maxLength={10} disabled={busy}
                className={`field-input ${errors.mobile ? 'field-input-error' : ''}`} />
            </F>
            <F label="Caste" error={errors.caste}>
              <select name="caste" value={form.caste} onChange={handleChange}
                disabled={busy} className="field-input">
                <option value="">-- Select --</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
              </select>
            </F>
          </div>

          {/* Working Place */}
          <SectionHeader icon="🏢" title="Working Place" />
          <div className="px-3 md:px-6 py-3 md:py-5 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
            <F label="Designation" required error={errors.designation}>
              <input type="text" name="designation" value={form.designation} onChange={handleChange}
                placeholder="e.g., Deputy Commissioner" disabled={busy}
                className={`field-input ${errors.designation ? 'field-input-error' : ''}`} />
            </F>
            <F label="Division" required error={errors.division}>
              <input type="text" name="division" value={form.division} onChange={handleChange}
                placeholder="Division name" disabled={busy}
                className={`field-input ${errors.division ? 'field-input-error' : ''}`} />
            </F>
            <F label="Circle" required error={errors.circle}>
              <input type="text" name="circle" value={form.circle} onChange={handleChange}
                placeholder="Circle name" disabled={busy}
                className={`field-input ${errors.circle ? 'field-input-error' : ''}`} />
            </F>
          </div>

          {/* Payment */}
          <SectionHeader icon="💳" title={`Payment — ₹${displayAmount}`} />
          <div className="px-3 md:px-6 py-3 md:py-5 space-y-4">

            {/* Payment info box */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-sm font-semibold text-blue-800 mb-1">
                Membership Fee: <span className="text-blue-600 text-base">₹{displayAmount}</span>
              </p>
              <p className="text-xs text-gray-500">
                Click the button below to pay securely via UPI, Net Banking, Credit/Debit Card, or Wallet.
                You will be redirected to the Cashfree secure payment page.
              </p>
            </div>

            {/* ── Manual bank transfer (commented out — replaced by Cashfree) ──
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">
                Pay ₹{amount} to the following account
              </p>
              <div className="flex flex-col gap-2">
                <CopyRow label="Account Name"   value="Telangana Commercial Taxes SC/ST Employees Association" />
                <CopyRow label="Bank"           value="Axis Bank — CCT Complex, Nampally" />
                <CopyRow label="Account Number" value="925010044679607" mono />
                <CopyRow label="IFSC Code"      value="UTIB0006036" mono />
              </div>
            </div>
            Screenshot upload section also removed — payment is now verified automatically.
            ── End manual payment ── */}

            {/* Pay error */}
            {payError && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-red-700">{payError}</p>
              </div>
            )}

            {/* Step 1 — Pay button */}
            <button
              type="submit"
              disabled={busy || paymentDone}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white text-sm shadow-md transition-all
                ${paymentDone
                  ? 'bg-green-500 cursor-default'
                  : paying
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'}`}
            >
              {paying ? (
                <><Spin /> {stepLabel}</>
              ) : paymentDone ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Payment of ₹{displayAmount} Received
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pay ₹{displayAmount}
                </>
              )}
            </button>

            {/* Step 2 — Submit button (enabled only after payment) */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!paymentDone || submitting}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white text-sm shadow-md transition-all
                ${!paymentDone
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : submitting
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'}`}
            >
              {submitting ? (
                <><Spin /> Submitting…</>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {paymentDone ? 'Submit Registration' : 'Submit (Pay First)'}
                </>
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              Secured by <span className="font-semibold text-gray-500">Cashfree Payments</span>
              &nbsp;· Your payment is 100% secure
            </p>
          </div>

          <div className="px-3 md:px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Fields marked <span className="text-red-500 font-semibold">*</span> are mandatory.
            </p>
          </div>

        </form>
      </div>

      <div className="max-w-3xl mx-auto mt-4 md:mt-5 rounded-xl bg-yellow-50 border-l-4 border-yellow-400 px-4 py-3">
        <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide mb-1">Need Help?</p>
        <p className="text-xs text-gray-700">
          For queries regarding payment or registration, contact{' '}
          <span className="font-semibold text-gray-900">A. Anand Kumar</span>{' '}
          <a href="tel:9398774991" className="font-semibold text-blue-700 underline">9398774991</a>
        </p>
      </div>

      <p className="text-center text-xs text-gray-400 mt-3 md:mt-4">
        Telangana Commercial Taxes S.C./S.T. Employees Association &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 bg-blue-50 border-t border-b border-blue-100">
      <span className="text-sm md:text-base">{icon}</span>
      <h2 className="text-xs md:text-sm font-semibold text-blue-800 uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function F({ label, required, error, children }) {
  return (
    <div>
      <label className="field-label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function Spin() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}
