export default function RefundPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-6 md:p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-2">Refunds &amp; Cancellations</h1>
        <p className="text-sm text-gray-500 mb-6">Last updated: April 2024</p>

        <div className="space-y-5 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-800 mb-1">1. Membership Fee</h2>
            <p>The membership registration fee of ₹1,000 is a one-time payment. Once the membership is activated and confirmed, the fee is non-refundable.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-1">2. Failed Payments</h2>
            <p>If your payment fails or is deducted but the membership is not activated, please contact us within 7 working days. We will investigate and process a refund if the payment was indeed deducted.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-1">3. Duplicate Payments</h2>
            <p>In case of duplicate payments, the extra amount will be refunded within 7–10 working days to the original payment method.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-1">4. Cancellation</h2>
            <p>Membership cancellation requests can be submitted by contacting the association. Cancellation does not entitle the member to a refund of the registration fee.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-1">5. Contact for Refunds</h2>
            <p>For refund-related queries, email us at <a href="mailto:tgscstassociationctdept@gmail.com" className="text-blue-600 hover:underline">tgscstassociationctdept@gmail.com</a> with your payment reference number.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
