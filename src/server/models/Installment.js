import mongoose from "mongoose";

const installmentSchema = new mongoose.Schema({
  groupId: String,
  installmentNo: Number,
  month: String,
  year: Number,
  winnerId: String,
  dividend: Number,
  payableAmount: Number,
  documents: [{
    name: String,
    filename: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Installment", installmentSchema);
