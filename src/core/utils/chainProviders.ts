import { Network, ethers } from 'ethers'
import { Multicall__factory } from '../../contracts/index.js'
import { Chain } from '../constants/chains.js'
import { MULTICALL_ADDRESS } from '../constants/MULTICALL_ADDRESS.js'
import { CustomMulticallJsonRpcProvider } from './CustomMulticallJsonRpcProvider.js'
import { logger } from './logger.js'
import { MulticallQueue } from './multicall.js'

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
    logger.debug({ chainId }, `Using standard provider`)
    return new ethers.JsonRpcProvider(url, chainId, {
      staticNetwork: Network.from(chainId),
    })
  }

  logger.debug({ chainId }, 'Using multicall queue provider')

  const provider = new ethers.JsonRpcProvider(url, chainId)

  // deployed on 100+ chains at address
  // https://www.multicall3.com/deployments
  const multicallContract = Multicall__factory.connect(
    MULTICALL_ADDRESS,
    provider,
  )

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

export const chainProviders: Record<Chain, ethers.JsonRpcProvider | undefined> =
  {
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
