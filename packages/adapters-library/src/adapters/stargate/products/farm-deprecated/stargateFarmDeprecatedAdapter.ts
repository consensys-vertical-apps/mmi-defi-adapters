import type { ProtocolAdapterParams } from '../../../../types/adapter.js'

import { AbstractStargateFarmAdapter } from '../../common/abstractFarmAdapter.js'
import { staticChainDataDepreciated } from '../../common/staticChainData.js'

export class StargateFarmDeprecatedAdapter extends AbstractStargateFarmAdapter {
  productId = 'farm-deprecated'

  staticChainData

  constructor(input: ProtocolAdapterParams) {
    super(input)
    this.staticChainData = staticChainDataDepreciated[input.chainId]!
  }
}
