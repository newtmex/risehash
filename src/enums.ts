export enum ChainConfig {
  /**
   * Number of forgers per round
   */
  N = 101,
  /**
   * Least rank to select forgers from
   */
  M = 199,
  /**
   * block time in milliseconds
   */
  blockTime = 30000,
  /**
   * Time to retry after fail
   */
  RETRY_INTERVAL = 120000,
  /**
   * Time in milliseconds for each forging round
   */
  roundInterval = N * blockTime
}
