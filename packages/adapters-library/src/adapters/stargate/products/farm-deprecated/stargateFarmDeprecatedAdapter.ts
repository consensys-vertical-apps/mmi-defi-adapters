import { ProtocolAdapterParams } from '../../../../types/adapter'

import { AbstractStargateFarmAdapter } from '../../common/abstractFarmAdapter'
import { staticChainDataDepreciated } from '../../common/staticChainData'

export class StargateFarmDeprecatedAdapter extends AbstractStargateFarmAdapter {
  productId = 'farm-deprecated'

  staticChainData

  constructor(input: ProtocolAdapterParams) {
    super(input)
    this.staticChainData = staticChainDataDepreciated[input.chainId]!
  }
}
