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
    res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
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