const midtransClient = require("midtrans-client");
const admin = require("firebase-admin");

// Inisialisasi Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
    ),
  });
}
const db = admin.firestore();

let core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") return res.status(405).end();

  const { amount, packageId } = req.body;
  const orderId = `ME-${Date.now()}`;

  try {
    // 1. Minta QRIS ke Midtrans dengan Properti Expiry
    const response = await core.charge({
      payment_type: "gopay", 
      transaction_details: { 
        gross_amount: amount, 
        order_id: orderId 
      },
      // ✅ TAMBAHKAN INI: Sinkron dengan timer 5 menit di Frontend
      expiry: {
        unit: "minutes",
        duration: 5
      }
    });

    const qrAction = response.actions.find((a) => a.name === "generate-qr-code");
    
    if (!qrAction) {
      throw new Error("Gagal generate QR Code dari Midtrans");
    }

    const qrString = qrAction.url;

    // 2. Simpan status PENDING ke Firebase
    await db.collection("payments").doc(orderId).set({
      status: "pending",
      amount,
      packageId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // Opsional: simpan waktu expired di DB untuk referensi
      expiresAt: Date.now() + (5 * 60 * 1000) 
    });

    res.json({ qrString, orderId });
  } catch (e) {
    console.error("Error pada Charge API:", e.message);
    res.status(500).json({ error: e.message });
  }
}