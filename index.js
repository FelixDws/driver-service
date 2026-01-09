require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.json()); // supaya req.body terbaca

// ======= DATABASE =======
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const cors = require("cors");
app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE"],
  allowedHeaders: ["Content-Type","Authorization"]
}));
app.use(express.json());

// ======= CREATE DRIVER =======
app.post("/drivers", async (req, res) => {
  try {
    const { nama, email, no_hp, password, alamat, kendaraan, status } = req.body;

    if (!nama || !email || !no_hp || !password)
      return res.status(400).json({ message: "Data wajib diisi" });

    const [cek] = await db.query("SELECT id FROM drivers WHERE email = ?", [email]);
    if (cek.length > 0) return res.status(400).json({ message: "Email sudah terdaftar" });

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO drivers (nama, email, no_hp, password_hash, alamat, kendaraan, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nama, email, no_hp, hash, alamat || null, kendaraan || null, status || "pending"]
    );

    res.status(201).json({ message: "Driver berhasil ditambahkan" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ======= READ ALL DRIVERS =======
app.get("/drivers", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nama, email, no_hp, alamat, kendaraan, status, created_at FROM drivers"
    );
    res.json({ drivers: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ======= READ DRIVER BY ID =======
app.get("/drivers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await db.query(
      "SELECT id, nama, email, no_hp, alamat, kendaraan, status, created_at FROM drivers WHERE id = ?",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Driver tidak ditemukan" });
    res.json({ driver: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ======= UPDATE DRIVER =======
app.put("/drivers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { nama, email, no_hp, password, alamat, kendaraan, status } = req.body;

    let hash;
    if (password) hash = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE drivers SET 
        nama = COALESCE(?, nama),
        email = COALESCE(?, email),
        no_hp = COALESCE(?, no_hp),
        password_hash = COALESCE(?, password_hash),
        alamat = COALESCE(?, alamat),
        kendaraan = COALESCE(?, kendaraan),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [nama, email, no_hp, hash, alamat, kendaraan, status, id]
    );

    res.json({ message: "Driver berhasil diupdate" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ======= DELETE DRIVER =======
app.delete("/drivers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await db.query("DELETE FROM drivers WHERE id = ?", [id]);
    res.json({ message: "Driver berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ======= TEST =======
app.get("/", (req, res) => res.send("Driver CRUD service jalan"));

// ======= JALANKAN SERVER =======
const PORT = 5000;
app.listen(PORT, () => console.log(`Driver CRUD service jalan di port ${PORT}`));
