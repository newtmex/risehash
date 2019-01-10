import { Delegate } from "risejs";

/**
 * Shape that describes a delegate stored in the database
 */
export interface DelegateStats extends IDelegate {
  uptime: number;// Uptime percentage
  afp: number;// Avg. Forging Prob. in percentage
  allocatedBlocks: number;// Total blocks allocated
  includedProbability: string;
}

/**
 * Extention of the shape of Delegate from DPoSV1
 * The former consensus does not have 
 * @param cmb
 * and
 * @param votesWeight
 */
export interface IDelegate extends Delegate {
  cmb: number;
  votesWeight: number;
}
