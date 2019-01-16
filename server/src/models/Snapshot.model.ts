import { Model, model, SchemaTypes, Schema } from 'mongoose';
import { ISnapshotModel } from '../interfaces/Snapshot.interface';

export let Snapshot: Model<ISnapshotModel> = model('Snapshot', new Schema({
  round: { type: Number, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  delegates: { type: [SchemaTypes.Mixed], required: true }
}));