import mongoose, { type Model } from "mongoose";
import { getNextSequence } from "./counter";

export interface UserDoc {
  id: number;
  email: string;
  passwordHash: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: "admin" | "staff";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<UserDoc>(
  {
    id: { type: Number, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    role: { type: String, enum: ["admin", "staff"], default: "staff" },
  },
  { timestamps: true, versionKey: false },
);

userSchema.pre("save", async function (next) {
  if (this.isNew && (this.id == null || Number.isNaN(this.id))) {
    this.id = await getNextSequence("users");
  }
  next();
});

export const UserModel: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", userSchema);
