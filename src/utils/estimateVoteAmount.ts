import {ExtendedAccount} from '@hiveio/dhive';
import {
  getAccount,
  BlockchainGlobalProps,
  parseToken,
  vestsToRshares,
} from '~/providers/steem/dsteemApi';

export const estimateVoteAmount = (
  account: ExtendedAccount,
  globalProps: BlockchainGlobalProps,
  voteWeight = 1,
) => {
  const {fundRecentClaims, fundRewardBalance, base, quote} = globalProps;
  // get account
  const votingPower = account.voting_power;
  const totalVests =
    parseToken(account.vesting_shares as string) +
    parseToken(account.received_vesting_shares as string) -
    parseToken(account.delegated_vesting_shares as string);

  // const votePct = voteWeight * 10000;
  // const rShares = vestsToRshares(totalVests, votingPower, votePct);

  const temp1 = totalVests * 1e6;
  const maxAmount =
    (temp1 * fundRewardBalance * ((base * 0.02) / quote)) / fundRecentClaims;
  //  console.log('maxAmount', maxAmount);
  const amount = ((maxAmount * votingPower) / 1e4) * voteWeight;
  //  console.log('vote amount', amount);
  return amount.toFixed(2);
};
