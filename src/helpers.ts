import { rise } from "risejs";
import { BigNumber } from 'bignumber.js';
import { ChainConfig } from './enums';
import { logger } from './services/logger'
import { DelegateStats, IDelegate } from "./interfaces/Delegate.interface";
import { Snapshot } from "./models/Snapshot.model";
import { OpenNodes } from "./openNodes";


const cache = {}; // calcPercentageV2 uses this
/**
 * This function was copied from the RISE explorer
 * @param {*} delegates 
 * I modified it to return everything including the probability of forging,
 * and my custom propeties from DelegateStats
 */
export function calcPercentageV2(delegates: IDelegate[]): any[] {
  //if (cache[round].percentages) {
  //  return cache[round].percentages;
  //}
  const totalWeight = delegates
    .map(d => new BigNumber(d.vote))
    .reduce((a, b) => a.plus(b));

  const probByslotDel: any[] = [];
  probByslotDel[0] = delegates
    .map(d => new BigNumber (d.vote).dividedBy(totalWeight));

  const cumulativeProbPerDelegates = delegates
    .map(d => new BigNumber(d.vote).dividedBy(totalWeight));

  let totalUsedWeightInPrevSlots = new BigNumber(0);
  for (let slot = 1; slot < ChainConfig.N; slot++) {
    // Build previous slot used weight
    const usedWeightInPrevSlot = delegates
      .map((d, idx) => probByslotDel[slot - 1][idx].multipliedBy(d.vote))
      .reduce((a, b) => a.plus(b));

    totalUsedWeightInPrevSlots = totalUsedWeightInPrevSlots.plus(usedWeightInPrevSlot);
    probByslotDel[slot] = [];
    for (let i = 0; i < delegates.length; i++) {
      const d = delegates[i];
      probByslotDel[slot][i] = new BigNumber(d.vote)
        .dividedBy(
          totalWeight
            .minus(totalUsedWeightInPrevSlots)
            .plus(cumulativeProbPerDelegates[i].multipliedBy(d.vote))
        )
        .multipliedBy(new BigNumber(1).minus(cumulativeProbPerDelegates[i]));

      cumulativeProbPerDelegates[i] = cumulativeProbPerDelegates[i]
        .plus(probByslotDel[slot][i]);
    }
  }

  const toRet: DelegateStats[] = [];
  for (let i = 0; i < delegates.length; i++) {
    const includedProbability = cumulativeProbPerDelegates[i].multipliedBy(100).toFixed(3);
    toRet.push({
      ...delegates[i],
      includedProbability,
      // All these bellow are null because we will update them later
      uptime: null,
      afp: null,
      allocatedBlocks: null
    });
  }
  //cache[round].percentages = toRet;
  return toRet;
};

export function getSnapshot() {
  logger.log('Getting new snapshot..');
  rise.blocks.getHeight().then(res => {
    if (res.success) {
      let round = Math.ceil(res.height / ChainConfig.N);
      return rise.delegates.getList({
        limit: ChainConfig.M // Limit to the current least ranking currently allowed to be selected
      }).then(res => {
        logger.log('Delegates data gotten..')
        let delegates: DelegateStats[] = calcPercentageV2(<IDelegate[]>res.delegates); // Typed to IDelegate as that's the current shape, type Delegate is the formaer shape
        logger.log('Adding new params to delegates')
        // Add new parameters to the delegates
        delegates.forEach(delegate => {
          delegate.allocatedBlocks = delegate.producedblocks + delegate.missedblocks
          delegate.uptime = delegate.producedblocks / delegate.allocatedBlocks
        })
        logger.log('Params added..')
        // Store the snapshot
        let snapshot = new Snapshot({ round, delegates });
        logger.log('Saving snapshot..')
        snapshot.save((err, snapshot) => {
          if (err) return logger.log('Failed to save snapshot:', err.errmsg);
          logger.log('Snapshot saved')
        });
        // Run again after the next round
        setTimeout(getSnapshot, ChainConfig.roundInterval);
      }).catch(err => {
        // Send an email to levi@techypharm.com about the error
        logger.error(err);
        retry_getSnapshot();
      })
    }
    logger.error('Failed to get blocks..')
    // Retry
    logger.log('Retrying..')
    getSnapshot()
  }).catch(err => {
    logger.error(err);
    retry_getSnapshot()
  })
}

/**
 * This is used to retry querring the apis,
 * after an error occurs...that is a catch block on the Promise.
 * cycling through all the available options
 */
function retry_getSnapshot() {
  // Cycle through avail node options
  OpenNodes.lastOpenNodes_index++;
  if (OpenNodes.lastOpenNodes_index >= OpenNodes.openNodes.length) {
    rise.nodeAddress = 'http://localhost:5555';
    OpenNodes.lastOpenNodes_index = -1; // Set to -1 so that when nretry_getSnapshot() is called, the value of OpenNodes.lastOpenNodes_index will be 0
  } else {
    rise.nodeAddress = OpenNodes.openNodes[OpenNodes.lastOpenNodes_index]
  }

  logger.log('Retrying..@index:', OpenNodes.lastOpenNodes_index, 'OpenNodes.openNodes.length is', OpenNodes.openNodes.length);
  setTimeout(getSnapshot, ChainConfig.RETRY_INTERVAL);
}
