// server/index.js

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import Client from "./models/Client.js";
import Group from "./models/Group.js";
import Payment from "./models/Payment.js";
import Installment from "./models/Installment.js";
import User from "./models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/chitfund";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const app = express();

// Middleware
app.use(cors({
  origin: CLIENT_ORIGIN ? CLIENT_ORIGIN.split(",").map((origin) => origin.trim()) : true,
}));
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// MongoDB Connection
mongoose.connect(MONGODB_URI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.log(err));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ----------------------
// AUTH & USER ROUTES
// ----------------------

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (username === "aknith" && password === "adminaknith") {
    return res.json({ _id: "superadmin", username: "aknith", displayName: "Aknith", role: "superadmin" });
  }
  try {
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: "Invalid username or password" });
    res.json({ ...user.toObject(), role: "operator" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/users", async (req, res) => {
  try { res.json(await User.find()); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/users", async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ----------------------
// CLIENT ROUTES
// ----------------------

// Create Client
app.post("/clients", async (req, res) => {
  try {
    console.log("Incoming client:", req.body);
    const client = await Client.create(req.body);
    res.json(client);
  } catch (err) {
    console.error(err); 
    res.status(500).json({ error: err.message });
  }
});

// Get Clients
app.get("/clients", async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Client
app.put("/clients/:id", async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Client
app.delete("/clients/:id", async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// GROUP ROUTES
// ----------------------

app.post("/groups", async (req, res) => {
  try {
    const group = await Group.create(req.body);
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/groups", async (req, res) => {
  try {
    const groups = await Group.find();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/groups/:id", async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.groupNumber === "") delete update.groupNumber;
    const group = await Group.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/groups/:id", async (req, res) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/groups/:id/members", async (req, res) => {
  try {
    const { memberIds } = req.body;
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { memberIds },
      { new: true }
    );
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload client documents inside a group
app.post("/groups/:id/client-documents", upload.array("documents"), async (req, res) => {
  try {
    const { clientId } = req.body;
    const docs = (req.files || []).map((f) => ({
      clientId,
      name: f.originalname,
      filename: f.filename,
      uploadedAt: new Date(),
    }));
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $push: { clientDocs: { $each: docs } } },
      { new: true }
    );
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a client document from a group
app.delete("/groups/:id/client-documents/:docId", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    const doc = group.clientDocs.id(req.params.docId);
    if (doc) {
      const filePath = path.join(uploadsDir, doc.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const updated = await Group.findByIdAndUpdate(
      req.params.id,
      { $pull: { clientDocs: { _id: req.params.docId } } },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload group-level reference documents
app.post("/groups/:id/documents", upload.array("documents"), async (req, res) => {
  try {
    const docs = (req.files || []).map((f) => ({
      name: f.originalname,
      filename: f.filename,
      uploadedAt: new Date(),
    }));
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $push: { groupDocs: { $each: docs } } },
      { new: true }
    );
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a group-level document
app.delete("/groups/:id/documents/:docId", async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    const doc = group.groupDocs.id(req.params.docId);
    if (doc) {
      const filePath = path.join(uploadsDir, doc.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const updated = await Group.findByIdAndUpdate(
      req.params.id,
      { $pull: { groupDocs: { _id: req.params.docId } } },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// PAYMENT ROUTES
// ----------------------

app.post("/payments", async (req, res) => {
  try {
    const payment = await Payment.create(req.body);
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/payments", async (req, res) => {
  try {
    const payments = await Payment.find();
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/payments/:id", async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/payments/:id", async (req, res) => {
  try {
    await Payment.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted payment" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// INSTALLMENT ROUTES
// ----------------------

app.get("/installments", async (req, res) => {
  try {
    const filter = req.query.groupId ? { groupId: req.query.groupId } : {};
    const installments = await Installment.find(filter);
    res.json(installments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/installments", async (req, res) => {
  try {
    const { groupId, installmentNo } = req.body;
    const installment = await Installment.findOneAndUpdate(
      { groupId, installmentNo },
      req.body,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(installment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/installments/:id", async (req, res) => {
  try {
    await Installment.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted installment" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload documents to an installment
app.post("/installments/:id/documents", upload.array("documents"), async (req, res) => {
  try {
    const docs = (req.files || []).map((f) => ({
      name: f.originalname,
      filename: f.filename,
      uploadedAt: new Date(),
    }));
    const installment = await Installment.findByIdAndUpdate(
      req.params.id,
      { $push: { documents: { $each: docs } } },
      { new: true }
    );
    res.json(installment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single document from an installment
app.delete("/installments/:id/documents/:docId", async (req, res) => {
  try {
    const installment = await Installment.findById(req.params.id);
    if (!installment) return res.status(404).json({ error: "Installment not found" });
    const doc = installment.documents.id(req.params.docId);
    if (doc) {
      const filePath = path.join(uploadsDir, doc.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const updated = await Installment.findByIdAndUpdate(
      req.params.id,
      { $pull: { documents: { _id: req.params.docId } } },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// SERVER START
// ----------------------

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
