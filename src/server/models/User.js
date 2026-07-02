import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  displayName: { type: String },
  permissions: {
    clients:  { view: Boolean, create: Boolean, edit: Boolean, delete: Boolean },
    groups:   { view: Boolean, create: Boolean, edit: Boolean, delete: Boolean, manageMembers: Boolean },
    payments: { view: Boolean, record: Boolean },
    reports:  { view: Boolean, editSchedule: Boolean, uploadDocs: Boolean },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);
