import { Delegate } from "risejs";

export interface DelegateStats extends IDelegate {
  // Infos on rise explorer already
  uptime: number;// Uptime percentage
  afp: number;// Avg. Forging Prob. in percentage
  allocatedBlocks: number;// Total blocks allocated
  includedProbability: string
}

export interface IDelegate extends Delegate {
  cmb: number;
  votesWeight: number;
}
