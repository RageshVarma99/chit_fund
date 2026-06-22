import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  groupId: String,
  clientId: String,
  month: String,
  year: Number,
  amount: Number,
  paymentDate: String,
  mode: String,
  transactionId: String,
  remark: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Payment", paymentSchema);
