import mongoose from "mongoose";

const ChallengeSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, required: true, index: true },
  orderId: { type: mongoose.Types.ObjectId, required: true, index: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
  status: { type: String, enum: ["ACTIVE", "WON", "EXPIRED"], default: "ACTIVE", index: true },
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

// optional TTL index for cleanup
// ChallengeSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("ChallengeSession", ChallengeSessionSchema);
