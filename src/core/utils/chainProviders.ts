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
  enableMulticall,
}: {
  url: string | undefined
  chainId: Chain
  enableMulticall: boolean
}) => {
  logger.info('Using multicall queue providers')
  if (!url) return undefined

  if (enableMulticall) {
    logger.info('Using multicall queue providers')

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

  logger.info('Using standard providers')
  return new ethers.providers.StaticJsonRpcProvider(url, chainId)
}

const enableMulticall = process.env.ENABLE_MULTICALL === 'true'

export const chainProviders: Record<
  Chain,
  ethers.providers.StaticJsonRpcProvider | undefined
> = {
  [Chain.Ethereum]: provider({
    url: process.env.ETHEREUM_PROVIDER_URL,
    chainId: Chain.Ethereum,
    enableMulticall,
  }),
  [Chain.Optimism]: provider({
    url: process.env.OPTIMISM_PROVIDER_URL,
    chainId: Chain.Optimism,
    enableMulticall,
  }),
  [Chain.Bsc]: provider({
    url: process.env.BSC_PROVIDER_URL,
    chainId: Chain.Bsc,
    enableMulticall,
  }),
  [Chain.Polygon]: provider({
    url: process.env.POLYGON_PROVIDER_URL,
    chainId: Chain.Polygon,
    enableMulticall,
  }),
  [Chain.Fantom]: provider({
    url: process.env.FANTOM_PROVIDER_URL,
    chainId: Chain.Fantom,
    enableMulticall,
  }),
  [Chain.Arbitrum]: provider({
    url: process.env.ARBITRUM_PROVIDER_URL,
    chainId: Chain.Arbitrum,
    enableMulticall,
  }),
  [Chain.Avalanche]: provider({
    url: process.env.AVALANCHE_PROVIDER_URL,
    chainId: Chain.Avalanche,
    enableMulticall,
  }),
  [Chain.Linea]: provider({
    url: process.env.LINEA_PROVIDER_URL,
    chainId: Chain.Linea,
    enableMulticall,
  }),
  [Chain.Base]: provider({
    url: process.env.BASE_PROVIDER_URL,
    chainId: Chain.Base,
    enableMulticall,
  }),
}
