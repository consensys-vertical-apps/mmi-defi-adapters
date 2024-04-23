[@metamask-institutional/defi-adapters](../README.md) / testCase

# Module: testCase

## Table of contents

### Type Aliases

- [TestCase](testCase.md#testcase)

## Type Aliases

### TestCase

Ƭ **TestCase**: \{ `key?`: `string` ; `chainId`: `Chain`  } & \{ `method`: ``"positions"`` ; `input`: \{ `userAddress`: `string` ; `filterProtocolTokens?`: `string`[] ; `filterTokenIds?`: `string`[]  } ; `blockNumber?`: `number`  } \| \{ `method`: ``"profits"`` ; `input`: \{ `userAddress`: `string` ; `timePeriod?`: `TimePeriod` ; `includeRawValues?`: `boolean` ; `filterProtocolTokens?`: `string`[] ; `filterTokenIds?`: `string`[]  } ; `blockNumber?`: `number`  } \| \{ `method`: ``"deposits"`` ; `input`: \{ `userAddress`: `string` ; `fromBlock`: `number` ; `toBlock`: `number` ; `protocolTokenAddress`: `string` ; `productId`: `string` ; `tokenId?`: `string`  }  } \| \{ `method`: ``"withdrawals"`` ; `input`: \{ `userAddress`: `string` ; `fromBlock`: `number` ; `toBlock`: `number` ; `protocolTokenAddress`: `string` ; `productId`: `string` ; `tokenId?`: `string`  }  } \| \{ `method`: ``"repays"`` ; `input`: \{ `userAddress`: `string` ; `fromBlock`: `number` ; `toBlock`: `number` ; `protocolTokenAddress`: `string` ; `productId`: `string` ; `tokenId?`: `string`  }  } \| \{ `method`: ``"borrows"`` ; `input`: \{ `userAddress`: `string` ; `fromBlock`: `number` ; `toBlock`: `number` ; `protocolTokenAddress`: `string` ; `productId`: `string` ; `tokenId?`: `string`  }  } \| \{ `method`: ``"prices"`` ; `blockNumber?`: `number` ; `filterProtocolToken?`: `string` ; `filterTokenId?`: `string`  } \| \{ `method`: ``"tvl"`` ; `blockNumber?`: `number`  } \| \{ `method`: ``"tx-params"`` ; `input`: [`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<`GetTransactionParams`, ``"protocolId"`` \| ``"chainId"``\>  }

#### Defined in

[packages/lib/src/types/testCase.ts:5](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/packages/lib/src/types/testCase.ts#L5)
