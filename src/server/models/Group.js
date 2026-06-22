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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Group", groupSchema);