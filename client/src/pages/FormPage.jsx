import { useState, useRef, useCallback } from 'react';
import api from '../api';

function loadCashfreeSDK() {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) { resolve(window.Cashfree); return; }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve(window.Cashfree);
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.head.appendChild(script);
  });
}

const AMOUNT = 1000;

const INITIAL = {
  name: '', parentsName: '', mobile: '', maritalStatus: '',
  designation: '', division: '', circle: '',
  educationQualifications: '', residenceAddress: '', interests: '',
  religion: '', caste: '',
};

export default function FormPage() {
  const [form,            setForm]           = useState(INITIAL);
  const [passport,        setPassport]       = useState(null);
  const [passportPreview, setPassportPreview]= useState(null);
  const [errors,          setErrors]         = useState({});
  const [submitting,      setSubmitting]     = useState(false);
  const [submitted,       setSubmitted]      = useState(false);
  const [serverMsg,       setServerMsg]      = useState('');

  // Payment state
  const [paymentDone,     setPaymentDone]    = useState(false);
  const [cashfreeOrderId, setCashfreeOrderId]= useState(null);
  const [payingNow,       setPayingNow]      = useState(false);
  const [payError,        setPayError]       = useState('');

  const passportRef = useRef(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
  }, []);

  const handlePassport = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) {
      setErrors(p => ({ ...p, passport: 'Only JPEG / PNG allowed.' })); return;
    }
    setErrors(p => ({ ...p, passport: '' }));
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300; canvas.height = 375;
        canvas.getContext('2d').drawImage(img, 0, 0, 300, 375);
        canvas.toBlob(blob => {
          setPassport(new File([blob], f.name, { type: 'image/jpeg' }));
          setPassportPreview(canvas.toDataURL('image/jpeg', 0.85));
        }, 'image/jpeg', 0.85);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  }, []);

  const removePassport = () => {
    setPassport(null); setPassportPreview(null);
    if (passportRef.current) passportRef.current.value = '';
  };

  // ── Cashfree Pay ──────────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!form.name.trim() || !form.mobile.trim()) {
      setPayError('Please fill in your Name and Mobile Number before paying.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
      setPayError('Enter a valid 10-digit mobile number before paying.');
      return;
    }
    setPayError('');
    setPayingNow(true);
    try {
      const { data } = await api.post('/api/payment/create-order', {
        name:   form.name.trim(),
        mobile: form.mobile.trim(),
      });

      const CashfreeSDK = await loadCashfreeSDK();
      const cashfree = CashfreeSDK({
        mode: import.meta.env.VITE_CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox',
      });

      const result = await cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget:   '_modal',
      });

      if (result.error) {
        setPayError(result.error.message || 'Payment failed. Please try again.');
        return;
      }

      const verify = await api.post('/api/payment/verify', { orderId: data.orderId });
      if (verify.data.paid) {
        setPaymentDone(true);
        setCashfreeOrderId(data.orderId);
        setPayError('');
      } else {
        setPayError('Payment not completed. Please try again.');
      }
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment error. Please try again.');
    } finally {
      setPayingNow(false);
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())                    e.name = 'Required';
    if (!form.parentsName.trim())             e.parentsName = 'Required';
    if (!form.mobile.trim())                  e.mobile = 'Required';
    else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) e.mobile = 'Enter a valid 10-digit mobile number';
    if (!form.maritalStatus)                  e.maritalStatus = 'Required';
    if (!form.designation.trim())             e.designation = 'Required';
    if (!form.division.trim())                e.division = 'Required';
    if (!form.circle.trim())                  e.circle = 'Required';
    if (!form.educationQualifications.trim()) e.educationQualifications = 'Required';
    if (!passport)                             e.passport = 'Passport size photo is required.';
    if (!paymentDone)                          e.payment = 'Please complete payment of ₹1,000 before submitting.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true); setServerMsg('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('passportPhoto', passport);
    fd.append('cashfreeOrderId', cashfreeOrderId);
    try {
      const { data } = await api.post('/api/submit-form', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
      setServerMsg(
        data.paymentStatus === 'Paid'
          ? 'Payment of ₹1,000 confirmed! Welcome to the Association.'
          : 'Form submitted. Your payment is being verified.'
      );
    } catch (err) {
      setServerMsg(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

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
            setPassport(null); setPassportPreview(null);
            setPaymentDone(false); setCashfreeOrderId(null);
          }} className="btn-primary w-full">Submit Another Response</button>
        </div>
      </div>
    );
  }

  /* ── Form ────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 md:py-8 px-3 md:px-4">

      {/* Header */}
      <div className="max-w-3xl mx-auto mb-4 md:mb-6 rounded-xl overflow-hidden shadow-lg">
        <img src={import.meta.env.BASE_URL + "header.jpeg"} alt="Telangana Commercial Taxes S.C./S.T. Employees Association"
          className="w-full h-auto block" />
      </div>

      {/* Card */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <form onSubmit={handleSubmit} noValidate>

          {/* Personal Details */}
          <SectionHeader icon="👤" title="Personal Details" />
          <div className="px-3 md:px-6 py-3 md:py-5 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
            <F label="Full Name" required error={errors.name}>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="Enter your full name"
                className={`field-input ${errors.name ? 'field-input-error' : ''}`} />
            </F>
            <F label="Parent's Name" required error={errors.parentsName}>
              <input type="text" name="parentsName" value={form.parentsName} onChange={handleChange}
                placeholder="Father's / Mother's name"
                className={`field-input ${errors.parentsName ? 'field-input-error' : ''}`} />
            </F>
            <F label="Mobile Number" required error={errors.mobile}>
              <input type="tel" name="mobile" value={form.mobile} onChange={handleChange}
                placeholder="10-digit mobile number" maxLength={10}
                className={`field-input ${errors.mobile ? 'field-input-error' : ''}`} />
            </F>
            <F label="Marital Status" required error={errors.maritalStatus}>
              <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange}
                className={`field-input ${errors.maritalStatus ? 'field-input-error' : ''}`}>
                <option value="">-- Select --</option>
                <option>Married</option>
                <option>Unmarried</option>
              </select>
            </F>
            <F label="Religion" error={errors.religion}>
              <input type="text" name="religion" value={form.religion} onChange={handleChange}
                placeholder="e.g., Hindu, Muslim, Christian" className="field-input" />
            </F>
            <F label="Caste" error={errors.caste}>
              <input type="text" name="caste" value={form.caste} onChange={handleChange}
                placeholder="Enter your caste" className="field-input" />
            </F>
          </div>

          {/* Passport Size Photo */}
          <SectionHeader icon="🪪" title="Passport Size Photo" />
          <div className="px-3 md:px-6 py-3 md:py-5">
            <p className="text-xs text-gray-500 mb-3">
              Upload a recent <strong>passport size photo</strong> (face clearly visible). JPEG or PNG only.
            </p>
            {!passportPreview ? (
              <label htmlFor="passportInput"
                className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-colors
                  ${errors.passport ? 'border-red-400 bg-red-50' : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 bg-blue-50/30'}`}>
                <svg className="w-10 h-10 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-semibold text-blue-600">Tap to upload passport photo</span>
                <span className="text-xs text-gray-400 mt-1">JPEG or PNG • will be cropped to passport size</span>
                <input id="passportInput" ref={passportRef} type="file" accept="image/jpeg,image/jpg,image/png"
                  className="hidden" onChange={handlePassport} />
              </label>
            ) : (
              <div className="relative inline-block">
                <img src={passportPreview} alt="passport preview"
                  className="h-40 w-32 rounded-lg border-2 border-green-300 shadow-sm object-cover" />
                <button type="button" onClick={removePassport}
                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow hover:bg-red-700">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-xs text-green-600 font-medium mt-2">✓ Passport photo uploaded</p>
              </div>
            )}
            {errors.passport && <p className="field-error mt-2">{errors.passport}</p>}
          </div>

          {/* Working Place */}
          <SectionHeader icon="🏢" title="Working Place" />
          <div className="px-3 md:px-6 py-3 md:py-5 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
            <F label="Designation" required error={errors.designation}>
              <input type="text" name="designation" value={form.designation} onChange={handleChange}
                placeholder="e.g., Deputy Commissioner"
                className={`field-input ${errors.designation ? 'field-input-error' : ''}`} />
            </F>
            <F label="Division" required error={errors.division}>
              <input type="text" name="division" value={form.division} onChange={handleChange}
                placeholder="Division name"
                className={`field-input ${errors.division ? 'field-input-error' : ''}`} />
            </F>
            <F label="Circle" required error={errors.circle}>
              <input type="text" name="circle" value={form.circle} onChange={handleChange}
                placeholder="Circle name"
                className={`field-input ${errors.circle ? 'field-input-error' : ''}`} />
            </F>
          </div>

          {/* Qualifications & Address */}
          <SectionHeader icon="🎓" title="Qualifications & Address" />
          <div className="px-3 md:px-6 py-3 md:py-5 grid grid-cols-1 gap-3 md:gap-5">
            <F label="Education Qualifications" required error={errors.educationQualifications}>
              <input type="text" name="educationQualifications" value={form.educationQualifications}
                onChange={handleChange} placeholder="e.g., B.Com, B.Sc, M.A."
                className={`field-input ${errors.educationQualifications ? 'field-input-error' : ''}`} />
            </F>
            <F label="Residence Address" error={errors.residenceAddress}>
              <textarea name="residenceAddress" value={form.residenceAddress} onChange={handleChange}
                rows={3} placeholder="Door No., Street, Area, District, PIN Code"
                className="field-input resize-none" />
            </F>
            <F label="Interests / Hobbies">
              <input type="text" name="interests" value={form.interests} onChange={handleChange}
                placeholder="e.g., Reading, Cricket, Music" className="field-input" />
            </F>
          </div>

          {/* Payment */}
          <SectionHeader icon="💳" title="Payment — ₹1,000" />
          <div className="px-3 md:px-6 py-3 md:py-5">
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
              <p className="text-xs text-gray-600">
                Pay <strong className="text-blue-700">₹{AMOUNT}</strong> membership fee securely via UPI, card, or net banking.
                <span className="ml-1 text-red-500 font-semibold">Payment is required to submit the form.</span>
              </p>

              {/* Status badge */}
              <div>
                {paymentDone ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Paid — ₹{AMOUNT}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="4" />
                    </svg>
                    Unpaid
                  </span>
                )}
              </div>

              {/* Pay button or success */}
              {paymentDone ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-green-700">Payment Successful</p>
                    <p className="text-xs text-green-600">Order ID: {cashfreeOrderId}</p>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={handlePay} disabled={payingNow}
                  className="flex items-center justify-center gap-2 w-full md:w-auto md:px-8 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {payingNow ? <><Spin /> Processing…</> : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Pay ₹{AMOUNT} Now
                    </>
                  )}
                </button>
              )}

              {payError && <p className="text-xs text-red-600">{payError}</p>}
              {errors.payment && <p className="text-xs text-red-600 font-medium">{errors.payment}</p>}
            </div>
          </div>

          {serverMsg && !submitted && (
            <div className="mx-3 md:mx-6 mb-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {serverMsg}
            </div>
          )}

          <div className="px-3 md:px-6 py-3 md:py-6 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <p className="text-xs text-gray-400">Fields marked <span className="text-red-500 font-semibold">*</span> are mandatory. Payment is required.</p>
            <button type="submit" disabled={submitting || !paymentDone}
              className={`btn-primary w-full md:w-auto md:px-10 ${!paymentDone ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {submitting ? <><Spin /> Submitting…</> : <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Submit Form
              </>}
            </button>
          </div>

        </form>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4 md:mt-6">
        Telangana Commercial Taxes S.C./S.T. Employees Association &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 bg-blue-50 border-t border-b border-blue-100">
      <span className="text-sm md:text-base">{icon}</span>
      <h2 className="text-xs md:text-sm font-semibold text-blue-800 uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function F({ label, required, error, children, className = '' }) {
  return (
    <div className={className}>
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
