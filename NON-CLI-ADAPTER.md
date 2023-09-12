## Adding a New Protocol (manual copy and paste)

To integrate a new protocol:

1. Update `src/adapters/index.ts`:
   - Add to `Protocol` object: key in CamelCase, value in kebab-case (matching folder name).
   - Add to `supportedProtocols` object.
2. Create a new folder in `src/adapters`, named in kebab-case, e.g., `src/${protocolName}/products/${productName}/productAdapter.ts`.

## Adding an Adapter (manual copy and paste)

After adding your protocol:

1. Generate metadata: e.g., `src/adapters/stargate/products/pool/arbitrum/metadata.json` using `src/adapters/stargate/buildMetadata.ts`.
2. Add metadata script to `protocolMetadataBuilders` object in `src/adapters/metadataBuilders.ts` and test `npm run metadata`
3. Create product folder: `src/${protocolName}/products/${productName}`.
4. Copy and paste the example adapter from `src/adapters/example/products/example-product/exampleProductAdapter.ts` to your product folder.
5. Replace hardcoded responses with your adapter code.
6. Add your adapter to `supportedProtocols` in `src/adapters/index.ts`.
7. Test your adapter (change userAddress accordingly):
   - Positions: `npm run positions 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255`.
   - Profits: `npm run profits 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255`.
   - Prices: `npm run prices 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255`.
