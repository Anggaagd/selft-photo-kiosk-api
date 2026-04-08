const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
  });
}
const db = admin.firestore();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { code, orderId } = req.body;

  try {
    const voucherRef = db.collection("vouchers").doc(code);
    const doc = await voucherRef.get();

    // 1. Cek keberadaan voucher
    if (!doc.exists) {
      return res.status(404).json({ message: "VOUCHER TIDAK DITEMUKAN" });
    }

    const voucherData = doc.data();

    // 2. Cek apakah sudah pernah digunakan
    if (voucherData.isUsed) {
      return res.status(400).json({ message: "VOUCHER SUDAH TERPAKAI" });
    }

    // 3. PROSES VALIDASI (Atomik)
    const batch = db.batch();
    
    // Tandai voucher sebagai terpakai
    batch.update(voucherRef, { 
      isUsed: true, 
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
      usedByOrderId: orderId 
    });

    // Update dokumen pembayaran agar UI di Kiosk otomatis pindah ke layar kamera
    const paymentRef = db.collection("payments").doc(orderId);
    batch.update(paymentRef, { 
      status: "settlement", 
      method: "voucher", 
      voucherCode: code 
    });

    await batch.commit();

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}