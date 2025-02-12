import { ethers, getAddress } from 'ethers'

import { CustomJsonRpcProvider } from '../core/provider/CustomJsonRpcProvider'
import { depositEventAbi } from './depositEventAbi'

class Eth2StakingIndexer {
  // Must start getting block withdrawals from this block number
  public withdrawalsEnabledBlockNumber = 17034871 //21693897
  // Must start getting block deposits from this block number
  private _depositsEnabledBlockNumber = 11052984
  private _depositContractAddress = '0x00000000219ab540356cBB839Cbe05303d7705Fa'
  private _provider: CustomJsonRpcProvider

  constructor(provider: CustomJsonRpcProvider) {
    this._provider = provider
  }

  createTableCommand = `
  CREATE TABLE IF NOT EXISTS eth2_staking (
      userAddress CHAR(40) PRIMARY KEY,
      deposits INTEGER DEFAULT 0,
      full_withdrawals INTEGER DEFAULT 0
  );
`

  public async withdrawalsProcessBlock(blockNumber: number): Promise<string[]> {
    const result: string[] = []

    const block = await this._provider.send('eth_getBlockByNumber', [
      `0x${ethers.toBeHex(blockNumber).slice(2).replace(/^0+/, '')}`,
      false,
    ])

    if (block.withdrawals?.length) {
      for (const withdrawal of block.withdrawals) {
        // Use ethers.js to properly parse the hex value
        const amountInGwei = BigInt(withdrawal.amount)
        // Convert Gwei to ETH (1 ETH = 1e9 Gwei)
        const amountInEth = Number(amountInGwei) / 1e9
        // Count how many full validator withdrawals (32 ETH each)
        const fullWithdrawals = Math.floor(amountInEth / 32)

        if (fullWithdrawals > 0) {
          const userAddress = `'${getAddress(withdrawal.address).slice(2)}'`
          const amount = fullWithdrawals * 32

          result.push(
            `INSERT INTO eth2_staking (userAddress, deposits, full_withdrawals) VALUES (${userAddress}, 0, ${amount}) ON CONFLICT(userAddress) DO UPDATE SET full_withdrawals = full_withdrawals + ${amount}`,
          )
        }
      }
    }

    return result
  }

  public async processLogIfEth2Deposit(log: ethers.Log): Promise<void> {
    if (
      !(
        log.address.toLowerCase() === this._depositContractAddress.toLowerCase()
      )
    ) {
      return
    }

    const iface = new ethers.Interface(depositEventAbi)
    const decodedLog = iface.parseLog(log)

    if (!decodedLog) {
      return
    }

    const userAddress = ethers
      .hexlify(decodedLog.args.withdrawal_credentials)
      .slice(26)
    const amount = ethers.hexlify(decodedLog.args.amount)

    await `INSERT INTO eth2_staking (userAddress, deposits, full_withdrawals) VALUES (${userAddress}, ${Number.parseInt(
      amount,
      16,
    )}, 0) ON CONFLICT(userAddress) DO UPDATE SET deposits = deposits + ${Number.parseInt(
      amount,
      16,
    )}`
  }
}

export default Eth2StakingIndexer
