[@metamask-institutional/defi-adapters](../README.md) / testCase

# Module: testCase

## Table of contents

### Type Aliases

- [TestCase](testCase.md#testcase)

## Type Aliases

### TestCase

Ƭ **TestCase**: { `key?`: `string` ; `chainId`: `Chain`  } & { `method`: ``"positions"`` ; `input`: { `userAddress`: `string`  } ; `blockNumber?`: `number`  } \| { `method`: ``"profits"`` ; `input`: { `userAddress`: `string` ; `timePeriod?`: `TimePeriod`  } ; `blockNumber?`: `number`  } \| { `method`: ``"deposits"`` ; `input`: { `userAddress`: `string` ; `fromBlock`: `number` ; `toBlock`: `number`  }  } \| { `method`: ``"withdrawals"`` ; `input`: { `userAddress`: `string` ; `fromBlock`: `number` ; `toBlock`: `number`  }  } \| { `method`: ``"prices"`` ; `blockNumber?`: `number`  } \| { `method`: ``"tvl"`` ; `blockNumber?`: `number`  } \| { `method`: ``"apy"`` ; `blockNumber?`: `number`  } \| { `method`: ``"apr"`` ; `blockNumber?`: `number`  }

#### Defined in

[testCase.ts:4](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/e9d45bd/src/types/testCase.ts#L4)
