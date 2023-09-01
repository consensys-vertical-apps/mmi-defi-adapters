import { ethers, Contract } from 'ethers'
import { Chain } from '../constants/chains'
import { logger } from './logger'
import { CustomMulticallJsonRpcProvider } from './CustomMulticallJsonRpcProvider'

import { MulticallQueue } from './multicall'
import multicallAbi from '../../contracts/abis/multicall.json'
import { Multicall } from '../../contracts'
import { MULTICALL_ADDRESS } from '../constants/MULTICALL_ADDRESS'

const provider = ({
  url,
  chainId,
  enableMulticallQueue,
}: {
  url: string | undefined
  chainId: Chain
  enableMulticallQueue: boolean
}) => {
  if (!url) return undefined

  if (!enableMulticallQueue) {
    logger.info({ chainId }, `Using standard provider`)
    return new ethers.providers.StaticJsonRpcProvider(url, chainId)
  }

  logger.info({ chainId }, 'Using multicall queue provider')

  const provider = new ethers.providers.StaticJsonRpcProvider(url, chainId)

  // deployed on 100+ chains at address
  // https://www.multicall3.com/deployments
  const multicallContract = new Contract(
    MULTICALL_ADDRESS,
    multicallAbi,
    provider,
  ) as Multicall

  const multicallQueue = new MulticallQueue({
    flushTimeoutMs: 2,
    maxBatchSize: 100,
    multicallContract,
  })

  return new CustomMulticallJsonRpcProvider({
    url,
    network: chainId,
    multicallQueue,
  })
}

const enableMulticallQueue = process.env.ENABLE_MULTICALL_QUEUE === 'true'

export const chainProviders: Record<
  Chain,
  ethers.providers.StaticJsonRpcProvider | undefined
> = {
  [Chain.Ethereum]: provider({
    url: process.env.ETHEREUM_PROVIDER_URL,
    chainId: Chain.Ethereum,
    enableMulticallQueue,
  }),
  [Chain.Optimism]: provider({
    url: process.env.OPTIMISM_PROVIDER_URL,
    chainId: Chain.Optimism,
    enableMulticallQueue,
  }),
  [Chain.Bsc]: provider({
    url: process.env.BSC_PROVIDER_URL,
    chainId: Chain.Bsc,
    enableMulticallQueue,
  }),
  [Chain.Polygon]: provider({
    url: process.env.POLYGON_PROVIDER_URL,
    chainId: Chain.Polygon,
    enableMulticallQueue,
  }),
  [Chain.Fantom]: provider({
    url: process.env.FANTOM_PROVIDER_URL,
    chainId: Chain.Fantom,
    enableMulticallQueue,
  }),
  [Chain.Arbitrum]: provider({
    url: process.env.ARBITRUM_PROVIDER_URL,
    chainId: Chain.Arbitrum,
    enableMulticallQueue,
  }),
  [Chain.Avalanche]: provider({
    url: process.env.AVALANCHE_PROVIDER_URL,
    chainId: Chain.Avalanche,
    enableMulticallQueue,
  }),
  [Chain.Linea]: provider({
    url: process.env.LINEA_PROVIDER_URL,
    chainId: Chain.Linea,
    enableMulticallQueue,
  }),
  [Chain.Base]: provider({
    url: process.env.BASE_PROVIDER_URL,
    chainId: Chain.Base,
    enableMulticallQueue,
  }),
}
