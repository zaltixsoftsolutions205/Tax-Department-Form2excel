export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-6 md:p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-500 mb-6">Last updated: April 2024</p>

        <div className="space-y-5 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-800 mb-1">1. Membership</h2>
            <p>By submitting the membership form and paying the registration fee of ₹1,000, you agree to become a member of the Telangana Commercial Taxes S.C./S.T. Employees Association (TCTS). Membership is open to eligible employees of the Telangana Commercial Taxes Department.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-1">2. Payment</h2>
            <p>The one-time membership registration fee is ₹1,000 (Indian Rupees One Thousand). Payment is processed securely via Cashfree Payment Gateway. All amounts are in INR.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-1">3. Data Usage</h2>
            <p>Personal information submitted through this form is used solely for membership registration and communication purposes. Your data will not be shared with any third party.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-1">4. Accuracy of Information</h2>
            <p>Members are responsible for providing accurate and truthful information during registration. Any false information may result in cancellation of membership.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-1">5. Contact</h2>
            <p>For any queries, contact us at <a href="mailto:tgscstassociationctdept@gmail.com" className="text-blue-600 hover:underline">tgscstassociationctdept@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
