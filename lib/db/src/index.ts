import mongoose from "mongoose";

let connectPromise: Promise<typeof mongoose> | null = null;

export function connectDB(): Promise<typeof mongoose> {
  if (connectPromise) return connectPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI must be set. Did you forget to provision a database?",
    );
  }

  mongoose.set("strictQuery", true);
  connectPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });
  return connectPromise;
}

export * from "./models/index";
