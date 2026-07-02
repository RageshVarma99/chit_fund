import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  groupNumber: { type: String, unique: true, sparse: true },
  name: String,
  monthlyAmount: Number,
  durationMonths: Number,
  startMonth: String,
  startYear: Number,
  memberIds: [String],
  adminFeeAmount: { type: Number, default: 0 },
  psoNo: String,
  commNo: String,
  clientDocs: [{
    clientId: String,
    name: String,
    filename: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  groupDocs: [{
    name: String,
    filename: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Group", groupSchema);