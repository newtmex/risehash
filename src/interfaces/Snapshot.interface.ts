import { Schema, Document, SchemaDefinition } from "mongoose";
import { IDelegate } from "./Delegate.interface";

export interface ISnapshotModel extends ISnapshot, Document {
}

export interface ISnapshot {
  round: Number,
  createdAt?: Date;
  delegates: IDelegate[];
}