import { Schema, Document, SchemaDefinition } from "mongoose";
import { IDelegate } from "./Delegate.interface";

export interface ISnapshotModel extends ISnapshot, Document {
}

/**
 * Shape of a single snapshot
 * @param round is unique
 */
export interface ISnapshot {
  round: Number,
  createdAt?: Date;
  delegates: IDelegate[];
}