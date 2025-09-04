# DeFi Adapter Development Helper

This guide captures key learnings from creating DeFi adapters, including both contract-based adapters (like Uniswap V4) and non-contract-based adapters (like ETH2 validator staking).

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

### Contract-Based Adapters
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

### Non-Contract-Based Adapters (External APIs)
```
packages/adapters-library/src/adapters/<protocol>/
├── products/
│   └── <product-type>/
│       ├── <protocol>Adapter.ts       # Main adapter implementation
│       └── tests/
│           ├── testCases.ts           # Test cases with real addresses
│           └── snapshots/
│               └── <chain>.positions.json  # Snapshot test results
└── ...
```

## 🔧 Key Implementation Patterns

### 1. Contract-Based Adapters

#### Contract Addresses Structure
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

#### Main Adapter Class Structure
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

#### Position Processing Pattern
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

### 2. Non-Contract-Based Adapters (External APIs)

#### External API Integration Pattern
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
    tokenIds,
  }: GetPositionsInput): Promise<ProtocolPosition[]> {
    if (!tokenIds || tokenIds.length === 0) {
      return []
    }

    // Fetch data from external API
    const externalData = await this.fetchExternalData(tokenIds)

    if (!externalData) {
      return []
    }

    // Process and return positions
    const protocolTokens = await this.getProtocolTokens()
    const protocolToken = protocolTokens[0]!

    return [
      {
        address: protocolToken.address,
        name: protocolToken.name,
        symbol: protocolToken.symbol,
        decimals: protocolToken.decimals,
        balanceRaw: this.calculateBalance(externalData),
        type: TokenType.Protocol,
        tokens: protocolToken.underlyingTokens.map((token) => ({
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          balanceRaw: this.calculateBalance(externalData),
          type: TokenType.Underlying,
        })),
      },
    ]
  }

  private async fetchExternalData(tokenIds: string[]): Promise<ExternalData | null> {
    try {
      const baseUrl = 'https://api.example.com/endpoint'
      const url = new URL(baseUrl)
      url.searchParams.set('ids', tokenIds.join(','))

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      })

      if (!response.ok) {
        logger.error(`API request failed: ${response.status} ${response.statusText}`)
        return null
      }

      return await response.json()
    } catch (error) {
      logger.error('Error fetching external data:', error)
      return null
    }
  }

  async getTokenIds({
    userAddress,
  }: GetTokenIdsInput): Promise<string[]> {
    // For external APIs, tokenIds might be derived from user address
    // or fetched from another endpoint
    return ['token1', 'token2'] // Example implementation
  }

  async unwrap({
    protocolTokenAddress,
  }: UnwrapInput): Promise<UnwrapExchangeRate> {
    return this.helpers.unwrapOneToOne({
      protocolToken: await this.getProtocolTokenByAddress(protocolTokenAddress),
      underlyingTokens: (
        await this.getProtocolTokenByAddress(protocolTokenAddress)
      ).underlyingTokens,
    })
  }
}
```

#### API Response Handling
```typescript
// Define response types
interface ApiResponse {
  data: ApiDataItem[]
  // other metadata fields
}

interface ApiDataItem {
  id: string
  balance: string
  // other fields
}

// Handle array responses
const data: ApiResponse = await response.json()
const items = data.data.filter(item => 
  tokenIds.includes(item.id)
)

// Convert balances (common patterns)
const balanceInWei = BigInt(item.balance) * BigInt(10 ** 9) // gwei to wei
const balanceInWei = BigInt(item.balance) // if already in wei
```

#### URL Construction Best Practices
```typescript
// Use URL constructor for proper parameter encoding
const baseUrl = 'https://api.example.com/endpoint'
const url = new URL(baseUrl)
url.searchParams.set('status', 'active')
url.searchParams.set('id', tokenIds.join(','))

// For debugging
console.log('API URL:', url.toString())
console.log('Response:', JSON.stringify(data, null, 2))
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

### 6. External API Issues
**Problem**: API responses don't match expected structure
**Solution**: 
- Use `JSON.stringify(data, null, 2)` for debugging
- Define proper TypeScript interfaces for responses
- Handle array vs single object responses correctly

### 7. URL Parameter Construction
**Problem**: Malformed URLs or incorrect parameter encoding
**Solution**: 
- Use `new URL()` constructor instead of string concatenation
- Use `url.searchParams.set()` for proper encoding
- Test URLs manually before implementing

### 8. Balance Conversion Errors
**Problem**: Incorrect unit conversions (gwei vs wei vs ETH)
**Solution**:
- Verify the API response unit (gwei, wei, etc.)
- Use proper conversion factors (1 ETH = 10^18 wei = 10^9 gwei)
- Add debugging logs to verify conversions

### 9. Protocol Token Address Consistency
**Problem**: Hardcoded addresses instead of using `getProtocolTokens()`
**Solution**:
- Always use `protocolToken.address` from `getProtocolTokens()`
- Avoid hardcoding addresses in `getPositions()`
- Ensure consistency between `getProtocolTokens()` and `getPositions()`

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

### 4. Debug External API Responses
```typescript
// Pretty print API responses
console.log('API Response:', JSON.stringify(response, null, 2))

// Log URL construction
console.log('Request URL:', url.toString())

// Verify balance conversions
console.log('Raw balance:', rawBalance)
console.log('Converted balance:', convertedBalance.toString())
console.log('Balance in ETH:', (Number(convertedBalance) / 1e18).toFixed(9))
```

### 5. Test API Endpoints Manually
```bash
# Test with curl to verify API behavior
curl -X GET "https://api.example.com/endpoint?status=active&id=0x123" \
  -H "accept: application/json"
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

### General Practices
1. **Start with CLI tools**: Use `npm run new-adapter` for proper structure
2. **Test incrementally**: Run snapshots frequently during development
3. **Handle errors gracefully**: Use try-catch and return undefined for failures
4. **Follow patterns**: Use existing adapters as reference
5. **Test thoroughly**: Use real data and multiple test cases

### Contract-Based Adapters
6. **Verify ABIs**: Always double-check ABI content and format
7. **Use proper types**: Leverage generated contract types
8. **Document addresses**: Include source links for contract addresses

### External API Adapters
9. **Define response types**: Create proper TypeScript interfaces for API responses
10. **Use URL constructor**: Always use `new URL()` for proper parameter encoding
11. **Handle array responses**: Check if API returns single object or array
12. **Verify unit conversions**: Double-check balance conversions (gwei/wei/ETH)
13. **Test API endpoints**: Use curl or Postman to verify API behavior manually
14. **Add debugging logs**: Use `JSON.stringify(data, null, 2)` for response debugging
15. **Centralize token info**: Use `getProtocolTokens()` instead of hardcoding addresses

## 🚨 Critical Reminders

- Always run `nvm use 22` before any npm commands
- Verify contract addresses against official documentation
- Test with real user addresses that have positions
- Handle missing data gracefully (return undefined, not errors)
- Use proper error handling and logging
- Follow the established file structure and naming conventions