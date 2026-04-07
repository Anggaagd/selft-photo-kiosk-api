const midtransClient = require('midtrans-client');

export default async function handler(req, res) {
  // Handle CORS preflight (Vercel butuh ini)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Hanya menerima metode POST' });
  }

  const { amount, packageId } = req.body;

  // Inisialisasi Midtrans Snap
  // Variabel Lingkungan (ENV) akan kita set di dashboard Vercel
  let snap = new midtransClient.Snap({
    isProduction: false, // Set false untuk Sandbox, true untuk Production
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
  });

  // Buat ID Transaksi unik dengan timestamp
  const orderId = `ME-PHOTO-${Date.now()}`;

  let parameter = {
    "transaction_details": {
      "order_id": orderId,
      "gross_amount": parseInt(amount)
    },
    "credit_card": {
      "secure": true
    },
    "item_details": [{
      "id": packageId,
      "price": parseInt(amount),
      "quantity": 1,
      "name": `Paket Photobooth ${packageId}`
    }],
    // Opsional: Batasi metode pembayaran hanya yang cocok untuk Kiosk
    "enabled_payments": ["qris", "gopay", "shopeepay", "other_qris"]
  };

  try {
    const transaction = await snap.createTransaction(parameter);
    
    // Kirim token kembali ke Kiosk
    return res.status(200).json({ 
      token: transaction.token,
      orderId: orderId 
    });
  } catch (error) {
    console.error('Midtrans Error:', error);
    return res.status(500).json({ error: error.message });
  }
}