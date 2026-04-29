import mongoose, { type Model } from "mongoose";

interface CounterDoc {
  _id: string;
  seq: number;
}

const counterSchema = new mongoose.Schema<CounterDoc>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

export const CounterModel: Model<CounterDoc> =
  (mongoose.models.Counter as Model<CounterDoc>) ||
  mongoose.model<CounterDoc>("Counter", counterSchema);

export async function getNextSequence(name: string): Promise<number> {
  const doc = await CounterModel.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
}
