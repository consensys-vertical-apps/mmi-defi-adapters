import { Erc20__factory } from '../../../../contracts'
import { AdaptersController } from '../../../../core/adaptersController'
import { Chain } from '../../../../core/constants/chains'
import { CacheToDb } from '../../../../core/decorators/cacheToDb'
import { NotImplementedError } from '../../../../core/errors/errors'
import { CustomJsonRpcProvider } from '../../../../core/provider/CustomJsonRpcProvider'
import { filterMapAsync } from '../../../../core/utils/filters'
import { getTokenMetadata } from '../../../../core/utils/getTokenMetadata'
import { Helpers } from '../../../../scripts/helpers'
import {
  IProtocolAdapter,
  ProtocolToken,
} from '../../../../types/IProtocolAdapter'
import {
  GetEventsInput,
  GetPositionsInput,
  GetRewardPositionsInput,
  GetTotalValueLockedInput,
  MovementsByBlock,
  MovementsByBlockReward,
  PositionType,
  ProtocolAdapterParams,
  ProtocolDetails,
  ProtocolPosition,
  ProtocolTokenTvl,
  TokenType,
  UnderlyingReward,
  UnwrapExchangeRate,
  UnwrapInput,
} from '../../../../types/adapter'
import { Erc20Metadata } from '../../../../types/erc20Metadata'
import { Protocol } from '../../../protocols'
import { AbstractStargateFarmAdapter } from '../../common/abstractFarmAdapter'
import {
  staticChainData,
  staticChainDataDepreciated,
} from '../../common/staticChainData'
import {
  LpStaking,
  LpStakingTime,
  LpStakingTime__factory,
  LpStaking__factory,
} from '../../contracts'
import { StargateFarmAdapter } from '../farm/stargateFarmAdapter'

export class StargateFarmDeprecatedAdapter extends AbstractStargateFarmAdapter {
  productId = 'farm-deprecated'

  staticChainData

  constructor(input: ProtocolAdapterParams) {
    super(input)
    this.staticChainData = staticChainDataDepreciated[input.chainId]!
  }
}
