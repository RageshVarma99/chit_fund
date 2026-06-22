import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  clientCode: String,
  name: String,
  phones: [String],
  email: String,
  address: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Client", clientSchema);