const admin = require('firebase-admin');
// Inisialisasi Firebase Admin (Gunakan ENV untuk keamanan)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

let core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

export default async function handler(req, res) {
  const notification = req.body;

  const orderId = notification.order_id;
  const status = notification.transaction_status;

  if (status === 'settlement' || status === 'capture') {
    // Update Firebase menjadi SETTLEMENT
    await admin.firestore().collection('payments').doc(orderId).update({
      status: 'settlement',
      settledAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  res.status(200).send('OK');
}