const logger = require('./logger');

logger.log('Starting app');

const rise = require('risejs').rise;
const BigNumber = require('bignumber.js');
const fs = require('fs');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/risehash', { useNewUrlParser: true });
let Snapshot = mongoose.model('Snapshot', new mongoose.Schema({
  round: { type: Number, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  delegates: { type: [mongoose.Mixed], required: true }
}))

const N = 101; // Number of forgers per round
const M = 199; // Least rank to select forgers from
const blockTime = 30000; // block time in milliseconds
const roundInterval = N * blockTime;
const RETRY_INTERVAL = 120000

// Select one of the nodes that their api is enabled
// or use localhost if in production
const openNodes = require('./test/openNodes');
rise.nodeAddress = process.env.NODE_ENV == 'production' ?
  'http://localhost:5555' :
  openNodes[2];

const cache = {}; // calcPercentageV2 uses this
/**
 * This function was copied from the RISE explorer
 * @param {*} delegates 
 * I modified it to return everything including the probability of forging
 */
function calcPercentageV2(delegates) {
  //if (cache[round].percentages) {
  //  return cache[round].percentages;
  //}
  const totalWeight = delegates
    .map(d => new BigNumber(d.vote))
    .reduce((a, b) => a.plus(b));

  const probByslotDel = [];
  probByslotDel[0] = delegates
    .map(d => new BigNumber(d.vote).dividedBy(totalWeight));

  const cumulativeProbPerDelegates = delegates
    .map(d => new BigNumber(d.vote).dividedBy(totalWeight));

  let totalUsedWeightInPrevSlots = new BigNumber(0);
  for (let slot = 1; slot < N; slot++) {
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

  const toRet = [];
  for (let i = 0; i < delegates.length; i++) {
    const includedProbability = cumulativeProbPerDelegates[i].multipliedBy(100).toFixed(3);
    toRet.push({
      ...delegates[i],
      includedProbability,
    });
  }
  //cache[round].percentages = toRet;
  return toRet;
};

function getSnapshot() {
  logger.log('Getting new snapshot..')
  rise.blocks.getHeight().then(res => {
    if (res.success) {
      let round = Math.ceil(res.height / N);
      return rise.delegates.getList({
        limit: M // Limit to the current least ranking currently allowed to be selected
      }).then(res => {
        logger.log('Delegates data gotten..')
        let delegates = calcPercentageV2(res.delegates);
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
          if (err) return logger.log('Failed to save snapshot');
          logger.log('Snapshot saved')
        });
        // Run again after the next round
        setTimeout(getSnapshot, roundInterval);
      }).catch(err => {
        // Send an email to levi@techypharm.com about the error
        logger.error(err);
        logger.log('Retrying..');
        setTimeout(getSnapshot, RETRY_INTERVAL);
      })
    }
    logger.error('Failed to get blocks..')
    // Retry
    logger.log('Retrying..')
    getSnapshot()
  }).catch(err => {
    logger.error(err);
    logger.log('Retrying..');
    setTimeout(getSnapshot, RETRY_INTERVAL);
  })
}

getSnapshot();