# Add Metadata Storage Support for 1:Many User-DeFi Position Relationships

## Overview
This PR implements a comprehensive metadata storage system to support 1:many relationships between users and their DeFi positions. This enables tracking multiple public keys for ETH2 staking and multiple token IDs for Uniswap V4, while maintaining a scalable and efficient data storage solution.

## Problem Statement
Previously, the system could only store one-to-one relationships between users and contract addresses. This limitation prevented:
- **ETH2 Staking**: Users with multiple validator public keys linked to the same withdrawal address
- **Uniswap V4**: Users with multiple token IDs for the same contract
- **Future Protocols**: Any protocol requiring multiple metadata values per user-contract pair

## Solution Architecture

### 1. Database Schema Changes
- **Added metadata columns** to `logs` table: `metadata_key` and `metadata_value` (TEXT)
- **Updated unique constraint** from `PRIMARY KEY (address, contract_address)` to `UNIQUE (address, contract_address, metadata_key, metadata_value)`
- **Added job configuration** columns: `additional_metadata_arguments` (JSONB) and `transform_user_address_type` (TEXT)

### 2. Type System Updates
- **Renamed `PoolFilter`** to `DefiPositionDetection` for better clarity
- **Extended `AdapterSettings`** to support metadata extraction and address transformation
- **Added `UserAddressTransformer`** type for reusable address transformation functions

### 3. Event Processing Enhancements
- **Generic metadata extraction** from event logs using configurable argument mappings
- **Address transformation system** for handling non-standard address formats (e.g., ETH2 withdrawal credentials)
- **Graceful handling** of unsupported address types (e.g., BLS credentials)

## Key Features

### Metadata Storage
- **Flexible metadata keys**: Support for any string-based metadata identifier
- **Multiple values per user-contract pair**: Enables 1:many relationships
- **Efficient querying**: Optimized indexes for fast metadata retrieval

### Address Transformation
- **Reusable transformers**: Generic system for converting raw event data to addresses
- **ETH2 support**: Handles withdrawal credentials transformation (`0x01` → address, `0x00` → skip)
- **Extensible design**: Easy to add new transformation types

### Event Configuration
- **Declarative metadata mapping**: Adapters specify which event arguments to extract as metadata
- **Type-safe configuration**: Compile-time validation of event ABI and argument names
- **Backward compatibility**: Existing adapters continue to work without changes

## Implementation Details

### Database Migrations
1. **0003-update-metadata-to-arrays.ts**: Adds metadata columns and job configuration
2. **0004-remove-logs-unique-constraint.ts**: Updates unique constraint to support multiple metadata entries

### Core Components
- **`parseUserEventLog`**: Enhanced to extract metadata and transform addresses
- **`UserAddressTransformer`**: Reusable transformation functions
- **`DefiPositionDetection`**: Updated to return both contract addresses and metadata
- **`DefiProvider`**: Integrates metadata into adapter calls

### Adapter Updates
- **ETH2 Validator Staking**: Configured to track `DepositEvent` with public key metadata
- **Uniswap V4**: Example configuration for `Transfer` events with token ID metadata

## Usage Examples

### ETH2 Staking Adapter
```typescript
adapterSettings: AdapterSettings = {
  userEvent: {
    eventAbi: 'event DepositEvent(bytes pubkey, bytes withdrawal_credentials, bytes amount, bytes signature, bytes index)',
    userAddressArgument: 'withdrawal_credentials',
    additionalMetadataArguments: {
      pubkey: 'pubkey',
    },
    transformUserAddressType: 'eth2-withdrawal-credentials',
  },
}
```

### Uniswap V4 Adapter
```typescript
adapterSettings: AdapterSettings = {
  userEvent: {
    eventAbi: 'event Transfer(address indexed from, address indexed to, uint256 indexed id)',
    userAddressArgument: 'from',
    additionalMetadataArguments: {
      tokenId: 'id',
    },
  },
}
```

## Database Schema

### Before
```sql
CREATE TABLE logs (
  address TEXT,
  contract_address TEXT,
  PRIMARY KEY (address, contract_address)
);
```

### After
```sql
CREATE TABLE logs (
  address TEXT,
  contract_address TEXT,
  metadata_key TEXT,
  metadata_value TEXT,
  UNIQUE (address, contract_address, metadata_key, metadata_value)
);
```

## Performance Considerations
- **Efficient indexing**: Optimized for common query patterns
- **Batch processing**: Maintains existing bulk insert performance
- **Memory usage**: Minimal overhead for metadata storage
- **Query optimization**: Uses `DISTINCT` where appropriate to maintain uniqueness

## Testing
- **Unit tests**: Updated for new type system and functionality
- **Integration tests**: Verified metadata extraction and storage
- **Smoke tests**: Confirmed backward compatibility

## Migration Path
1. **Deploy migrations**: Update database schema
2. **Update adapters**: Configure metadata extraction as needed
3. **Redeploy workers**: Start processing events with metadata
4. **Verify data**: Confirm metadata is being stored correctly

## Future Enhancements
- **Additional transformers**: Support for more address transformation types
- **Metadata validation**: Type checking for metadata values
- **Performance monitoring**: Metrics for metadata processing efficiency
- **Query optimization**: Further indexing improvements based on usage patterns

## Breaking Changes
- **`PoolFilter` → `DefiPositionDetection`**: Type name change (with backward compatibility)
- **Database schema**: Requires migration for existing deployments
- **Adapter configuration**: New optional fields (backward compatible)

## Dependencies
- **PostgreSQL**: Requires support for JSONB and advanced indexing
- **TypeScript**: Updated type definitions
- **Ethers.js**: Enhanced event parsing capabilities

## Security Considerations
- **Input validation**: All metadata values are validated before storage
- **SQL injection**: Parameterized queries prevent injection attacks
- **Data integrity**: Unique constraints prevent duplicate entries
- **Access control**: Existing authentication and authorization remain unchanged

## Monitoring and Observability
- **Logging**: Enhanced logging for metadata processing
- **Metrics**: Track metadata extraction success rates
- **Error handling**: Graceful handling of transformation failures
- **Debugging**: Improved error messages for configuration issues

## Documentation
- **API documentation**: Updated type definitions and examples
- **Migration guide**: Step-by-step deployment instructions
- **Configuration reference**: Complete adapter configuration examples
- **Troubleshooting**: Common issues and solutions

## Conclusion
This PR provides a robust, scalable solution for storing and retrieving metadata associated with DeFi positions. The implementation maintains backward compatibility while enabling new use cases that require 1:many relationships between users and their DeFi assets.

The system is designed to be:
- **Extensible**: Easy to add new metadata types and transformation functions
- **Performant**: Efficient storage and querying of metadata
- **Maintainable**: Clear separation of concerns and well-documented code
- **Reliable**: Comprehensive error handling and data validation

This foundation will support current requirements (ETH2 staking, Uniswap V4) while providing flexibility for future DeFi protocols that require similar metadata tracking capabilities.