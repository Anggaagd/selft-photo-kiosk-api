const admin = require('firebase-admin');

// 1. Inisialisasi Firebase Admin (WAJIB ADA DI TIAP FILE API)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Tambahkan Header CORS agar aman
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Midtrans mengirim notifikasi via POST
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const notification = req.body;
    console.log("Notifikasi diterima dari Midtrans:", notification);

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;

    // 2. Tentukan status yang dianggap "LUNAS"
    let finalStatus = 'pending';
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      finalStatus = 'settlement';
    } else if (transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
      finalStatus = 'failed';
    }

    // 3. Update Firestore berdasarkan Order ID
    if (orderId) {
      await db.collection('payments').doc(orderId).update({
        status: finalStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        // Simpan log mentah dari Midtrans untuk jaga-jaga
        rawNotification: transactionStatus 
      });
      console.log(`Order ${orderId} berhasil diupdate ke status: ${finalStatus}`);
    }

    // 4. Balas Midtrans dengan Status 200 agar mereka berhenti kirim notifikasi
    return res.status(200).send('OK');
    
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ error: error.message });
  }
}