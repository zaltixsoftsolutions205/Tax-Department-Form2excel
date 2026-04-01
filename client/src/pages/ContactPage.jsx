export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-6 md:p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Contact Us</h1>
        <p className="text-sm text-gray-500 mb-6">Telangana Commercial Taxes S.C./S.T. Employees Association</p>

        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="font-semibold text-gray-800">Organisation</p>
            <p>TCTS S.C./S.T. Employees Association (TCTS)</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Email</p>
            <a href="mailto:tgscstassociationctdept@gmail.com" className="text-blue-600 hover:underline">
              tgscstassociationctdept@gmail.com
            </a>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Address</p>
            <p>Telangana Commercial Taxes Department,<br />Hyderabad, Telangana, India</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Membership Fee</p>
            <p>₹1,000 (One-time registration fee)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
