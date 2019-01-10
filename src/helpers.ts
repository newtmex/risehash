import { rise } from "risejs";
import { BigNumber } from 'bignumber.js';
import { ChainConfig } from './enums';
import { logger } from './services/logger'
import { DelegateStats, IDelegate } from "./interfaces/Delegate.interface";
import { Snapshot } from "./models/Snapshot.model";
import { OpenNodes } from "./openNodes";
import { MongoError } from "mongodb";
import { MongooseDocument } from "mongoose";
import { ISnapshotModel } from "./interfaces/Snapshot.interface";
import moment = require("moment");


const cache = {}; // calcPercentageV2 uses this
/**
 * This function was copied from the RISE explorer
 * @param {*} delegates 
 * I modified it to return everything including the probability of forging,
 * and my custom propeties from DelegateStats
 */
function calcPercentageV2(delegates: IDelegate[]): any[] {
  //if (cache[round].percentages) {
  //  return cache[round].percentages;
  //}
  const totalWeight = delegates
    .map(d => new BigNumber(d.vote))
    .reduce((a, b) => a.plus(b));

  const probByslotDel: any[] = [];
  probByslotDel[0] = delegates
    .map(d => new BigNumber(d.vote).dividedBy(totalWeight));

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
  logger.log(`Getting new snapshot..from: ${rise.nodeAddress}`);
  rise.blocks.getHeight().then(res => {
    if (res.success) {
      let round = Math.ceil(res.height / ChainConfig.N);
      return rise.delegates.getList({
        limit: ChainConfig.M // Limit to the current least ranking currently allowed to be selected
      }).then(res => {
        logger.log('Delegates data gotten..')
        let delegates: DelegateStats[] = calcPercentageV2(<IDelegate[]>res.delegates); // Typed to IDelegate as that's the current shape, type Delegate is the former shape
        // Add new parameters to the delegates
        delegates.forEach(delegate => {
          delegate.allocatedBlocks = delegate.producedblocks + delegate.missedblocks;
          delegate.uptime = delegate.producedblocks / delegate.allocatedBlocks;
        });
        logger.log('New params added..');
        // Store the snapshot
        let snapshot = new Snapshot({ round, delegates });
        logger.log('Saving snapshot..');
        snapshot.save((err) => {
          if (err) return handle_MongoError({ err, doc: snapshot });
          logger.log('Snapshot saved\n');
          // Run again after the next round
          setTimeout(getSnapshot, ChainConfig.roundInterval);
        });
      }).catch(err => {
        // Send an email to levi@techypharm.com about the error
        logger.error(err);
        retry_getSnapshot();
      });
    }
    logger.error('Failed to get blocks..');
    // Retry
    logger.log('Retrying..');
    getSnapshot();
  }).catch(err => {
    logger.error(err);
    retry_getSnapshot();
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

/**
 * Handles MongoError by taking appropriate action based on the
 * conditions @condition[number] bellow
 * @param obj : { err: MongoError, doc: MongooseDocument }
 * @condition[0] : Calls @function getSnapshot() after adjusted timeout of @var timeToNextRound
 */
function handle_MongoError(obj: { err: MongoError, doc: MongooseDocument }): void {
  if (obj.err.code == 11000) {
    // DUPLICATE KEY ISH
    logger.error('Duplicate key.');

    if (obj.doc.get('round')) { // If a snapshot document
      // Adjust the time to request for the next snapshot, then continue the sequence as usual
      logger.log('Adjusting time to request for the next snapshot.');
      Snapshot.find({ round: obj.doc.get('round') }) // Find the snapshot that prevented this duplicate from
        .then((snapshots: ISnapshotModel[]) => {
          let snapshot = snapshots[0];
          let elapsedTime = Date.now() - (new Date(snapshot.createdAt).getTime());
          // get timeToNextRound relative to the last time a round was meant to occur
          let timeToNextRound = ChainConfig.roundInterval - (elapsedTime % ChainConfig.roundInterval);
          // Shedule the call to getSnapshot at the appropriate time
          setTimeout(getSnapshot, timeToNextRound);
          logger.log(`timeToNextRound: ${moment().to(Date.now() + timeToNextRound, true)}\n`);
        })
    }
  }
}