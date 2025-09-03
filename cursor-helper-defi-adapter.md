# DeFi Adapter Development Helper

This guide captures key learnings from creating DeFi adapters, specifically based on the Uniswap V4 adapter development process.

## 🚀 Quick Start Process

### 1. Initial Setup
```bash
# Always use nvm first
nvm use 22

# Create new adapter
npm run new-adapter

# Build contract types after adding ABIs
npm run build-types

# Run snapshots to test
npm run build-snapshots -- -p <protocol-name>
```

### 2. Essential Commands
- `npm run new-adapter` - Creates adapter structure
- `npm run build-types` - Generates TypeScript types from ABIs
- `npm run build-snapshots` - Tests adapter with real data
- `npm run build-snapshots -- -p <protocol>` - Test specific protocol

## 📁 File Structure

```
packages/adapters-library/src/adapters/<protocol>/
├── contracts/
│   ├── abis/
│   │   ├── ContractName.json          # ABI files
│   │   └── ...
│   ├── ContractName.ts                # Generated contract types
│   ├── index.ts                       # Export all contracts
│   └── factories/                     # Generated contract factories
├── products/
│   └── <product-type>/
│       ├── <protocol>Adapter.ts       # Main adapter implementation
│       ├── <protocol>-helper.ts       # Helper functions (optional)
│       └── tests/
│           └── testCases.ts           # Test cases with real addresses
└── ...
```

## 🔧 Key Implementation Patterns

### 1. Contract Addresses Structure
```typescript
const contractAddresses: Partial<
  Record<Chain, { contract1: string; contract2: string }>
> = {
  [Chain.Ethereum]: {
    contract1: getAddress('0x...'),
    contract2: getAddress('0x...'),
  },
  // Add other chains as needed
}
```

### 2. Main Adapter Class Structure
```typescript
export class ProtocolAdapter implements IProtocolAdapter {
  productId = 'product-type'
  protocolId: Protocol
  chainId: Chain

  constructor(chainId: Chain) {
    this.chainId = chainId
    this.protocolId = Protocol.ProtocolName
  }

  async getPositions({
    userAddress,
    blockNumber,
    tokenIds,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    // Implementation
  }

  async getTokenIds({
    userAddress,
    blockNumber,
  }: GetTokenIdsInput): Promise<string[]> {
    // Implementation
  }

  async unwrap({
    protocolTokenAddress,
    blockNumber,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    throw new NotImplementedError()
  }
}
```

### 3. Position Processing Pattern
```typescript
return filterMapAsync(tokenIds, async (tokenId) => {
  try {
    // Fetch position data
    const result = await helperFunction(tokenId, contracts, blockNumber)
    
    if (!result) {
      return undefined
    }

    // Get token metadata
    const [token0Metadata, token1Metadata] = await Promise.all([
      this.helpers.getTokenMetadata(result.token0.address),
      this.helpers.getTokenMetadata(result.token1.address),
    ])

    // Create protocol token name
    const nftName = this.protocolTokenName(
      token0Metadata.symbol,
      token1Metadata.symbol,
      tokenId.toString(),
    )

    return {
      address: contractAddresses[this.chainId]!.mainContract,
      tokenId: tokenId.toString(),
      name: nftName,
      symbol: nftName,
      decimals: 18, // or appropriate value
      balanceRaw: BigInt(result.liquidity), // or appropriate balance
      type: TokenType.Protocol,
      tokens: [
        this.createUnderlyingToken(
          result.token0.address,
          token0Metadata,
          BigInt(result.token0.rawBalance),
          TokenType.UnderlyingClaimable,
        ),
        this.createUnderlyingToken(
          result.token1.address,
          token1Metadata,
          BigInt(result.token1.rawBalance),
          TokenType.UnderlyingClaimable,
        ),
      ],
    }
  } catch (error) {
    console.error('Error getting position:', error)
    return undefined
  }
})
```

## 🛠 Common Helper Functions

### 1. Protocol Token Naming
```typescript
private protocolTokenName(
  token0Symbol: string,
  token1Symbol: string,
  tokenId: string,
): string {
  return `${token0Symbol}/${token1Symbol} #${tokenId}`
}
```

### 2. Underlying Token Creation
```typescript
private createUnderlyingToken(
  address: string,
  metadata: Erc20Metadata,
  balance: bigint,
  type: TokenType,
): Underlying {
  return {
    address: getAddress(address),
    name: metadata.name,
    symbol: metadata.symbol,
    decimals: metadata.decimals,
    balanceRaw: balance,
    type,
  }
}
```

### 3. Contract Connection Pattern
```typescript
const contract = ContractFactory.connect(
  contractAddresses[this.chainId]!.contractAddress,
  this.helpers.provider,
)
```

## 📋 Required Updates

### 1. Protocol Registration
Add to `packages/adapters-library/src/adapters/protocols.ts`:
```typescript
export enum Protocol {
  // ... existing protocols
  NewProtocol: 'new-protocol',
}
```

### 2. Supported Protocols
Add to `packages/adapters-library/src/adapters/supportedProtocols.ts`:
```typescript
import { NewProtocolAdapter } from './new-protocol/products/pool/newProtocolAdapter'

export const supportedProtocols: Partial<
  Record<Chain, Partial<Record<Protocol, IProtocolAdapter>>>
> = {
  // ... existing protocols
  [Chain.Ethereum]: {
    // ... existing adapters
    [Protocol.NewProtocol]: new NewProtocolAdapter(Chain.Ethereum),
  },
}
```

## 🧪 Testing Setup

### 1. Test Cases Structure
```typescript
export const testCases: TestCase[] = [
  {
    chainId: Chain.Ethereum,
    method: 'getPositions',
    input: {
      userAddress: '0x...', // Real user with positions
      blockNumber: 12345678,
    },
    filterProtocolTokenAddress: '0x...', // Main contract address
    filterTokenIds: ['1', '2', '3'], // Specific token IDs to test
  },
]
```

### 2. Test User Requirements
- Use real user addresses that have positions
- Include specific token IDs in `filterTokenIds`
- Set `filterProtocolTokenAddress` to the main contract
- Use recent block numbers for accurate data

## ⚠️ Common Pitfalls & Solutions

### 1. Node.js Version Issues
**Problem**: `--experimental-strip-types` errors
**Solution**: Always run `nvm use 22` before commands

### 2. ABI Issues
**Problem**: Wrong ABI content or malformed JSON
**Solution**: 
- Verify ABI source (official docs, GitHub, Etherscan)
- Use `sed` to clean TypeScript syntax from ABIs
- Ensure valid JSON format

### 3. Contract Address Mismatches
**Problem**: Using wrong contract addresses
**Solution**: Always verify against official deployment docs

### 4. Type Errors
**Problem**: `TokenType` used as namespace
**Solution**: Import as `import { TokenType } from '...'` not `import type { TokenType }`

### 5. Missing Dependencies
**Problem**: Missing packages like `decimal.js`, `jsbi`
**Solution**: Add to `packages/adapters-library/package.json`

## 🔍 Debugging Tips

### 1. Add Console Logs
```typescript
console.log('Debug info:', {
  tokenId,
  result,
  error: error.message,
})
```

### 2. Check Contract Calls
```typescript
try {
  const result = await contract.methodName(params)
  console.log('Contract call success:', result)
} catch (error) {
  console.error('Contract call failed:', error.message)
}
```

### 3. Verify Data Types
```typescript
console.log('Value:', value)
console.log('Type:', typeof value)
console.log('Constructor:', value?.constructor?.name)
```

## 📚 External Resources

### 1. Protocol Documentation
- Always check official protocol docs first
- Look for SDK examples and guides
- Verify contract addresses from official sources

### 2. Contract Verification
- Use Etherscan/block explorers to verify contracts
- Check ABI matches deployed contract
- Verify function signatures and return types

### 3. Testing Data
- Use real user addresses with positions
- Test with multiple token IDs
- Use recent block numbers for accuracy

## 🎯 Best Practices

1. **Start with CLI tools**: Use `npm run new-adapter` for proper structure
2. **Verify ABIs**: Always double-check ABI content and format
3. **Test incrementally**: Run snapshots frequently during development
4. **Handle errors gracefully**: Use try-catch and return undefined for failures
5. **Use proper types**: Leverage generated contract types
6. **Follow patterns**: Use existing adapters as reference
7. **Document addresses**: Include source links for contract addresses
8. **Test thoroughly**: Use real data and multiple test cases

## 🚨 Critical Reminders

- Always run `nvm use 22` before any npm commands
- Verify contract addresses against official documentation
- Test with real user addresses that have positions
- Handle missing data gracefully (return undefined, not errors)
- Use proper error handling and logging
- Follow the established file structure and naming conventions