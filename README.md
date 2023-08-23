<h1 align="center" style="border-bottom: none">
    <b>
        <a href="https://images.ctfassets.net/9sy2a0egs6zh/2XUXAYxxFFVjPlZABUoiLg/d0ff82237d3e5d9bd1097a98e0754453/MMI-icon.svg">
            <img alt="Defi Lambdas" width="408px" src="https://images.ctfassets.net/9sy2a0egs6zh/2XUXAYxxFFVjPlZABUoiLg/d0ff82237d3e5d9bd1097a98e0754453/MMI-icon.svg" />
        </a><br>
    </b>
</h1>

# Description
MMI Defi adapter library

We have created an open source DeFi adapater library. The aim of this library is to provide the tools and scaffolding for a DeFi protocol to build an adapter. This adapter will provide read and write capabilities within the MMI and MetaMask portfolio dashboards.
Our goal is to (i) connect users with DeFi protocols (ii) benefit the wider ecosystem (iii) simplify and standardize adapter building.

# Getting Started
## Requirements
- Node v18

## Installation
Create a copy of `.env.example` as `.env`.

Run the following command:
```
npm i
```

## Building
Run the following command for building the app once
```
npm run build
```

Run the following command for constantly building the app during development
```
npm run build:watch
```

# Running the app
## Get positions
```
npm run positions 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255
```

## Get PnL
```
npm run profits 0xB0D502E938ed5f4df2E681fE6E419ff29631d62b
```

## Get price per share
```
npm run prices
```

## Get total value lock
```
npm run tvl
```

# Support for a new protocol
```
mmi-defi-adapters/
│
└── src/
    ├── adapters/                                       # Folder for all the protocol adapters and code
    │   ├── example-protocol/                           # Folder for the new protocol called example-protocol
    │   │   ├── products/                               # Folder for the different protocol product
    │   │   │   ├── pool/                               # Folder for the pool product
    │   │   │   │   ├── ethereum/                       # Folder with protocol specific metadata and code
    │   │   │   │   ├── optimism/                       # Folder with protocol specific metadata and code
    │   │   │   │   ├── arbitrum/                       # Folder with protocol specific metadata and code
    │   │   │   │   └── protocolNamePoolAdapter.ts      # Implementation of IProtocolAdapter
    │   │   │   │
    │   │   │   └── vesting/                            # Folder for the staking product
    │   │   │       ├── ethereum/                       # Folder with protocol specific metadata and code
    │   │   │       ├── arbitrum/                       # Folder with protocol specific metadata and code
    │   │   │       └── protocolNameVestingAdapter.ts   # Implementation of IProtocolAdapter
    │   │   │
    │   │   └── buildMetadata.ts                        # Metadata builder script
    │   │
    │   ├── index.ts                                    # Exports supportedProtocols object
    │   └── metadataBuilders.ts                         # Exports protocolMetadataBuilders object
    │
    └── contracts/
        └── abis/
            └── example-protocol/                       # Folder to place all the protocol contract abis
                ├── example-lp-factory-contract.json    # Abi for the protocol lp-factory contract
                └── example-staking-contract.json       # Abi for the protocol staking contract
```

## How to contribute to repo
To-do


## Adding a new Protocol

Follow these steps to integrate a new protocol into our DeFi platform. 

1. Add entry to the `Protocol` object in `src/adapters/index.ts`. Use CamelCase for the key, Use kebab-case for the value (it should match the folder name).
2. Create a new folder within `src/adapters` folder with the name of the protocol using kebab-case. Full example or route `src/${protocolName}/products/${productName}/productAdapter.ts`.
3. Add protocol to the `supportedProtocols` object in `src/adapters/index.ts`.

## Adding a new Adapter for your Protocol

Once you have added your protocol (see above) you are ready to add your first adapter for your product(s). Note that some steps like creating a metadata script may not be mandatory for your adapter while others might be needed on a per-chain basis.

1. Generate metadata json file to support your product adapter. Example file src/adapters/stargate/products/pool/arbitrum/metadata.json example script src/adapters/stargate/buildMetadata.ts 
2. Add product folder within `src/${protocolName}/products/${productName}`
3. Copy example protocol adapter and save within your above product folder. Example can be found here `src/adapters/example/products/exampleProduct/exampleAdapter.ts`
4. Add your adapter code replacing the hardcoded responses 
5. Add your adapter to the `supportedProtocols` object in `src/adapters/index.ts`
6. Run your adapter using `npm run positions 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255`. Note: replace address with one that has a position.
7. Also you can run profits `npm run profits 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255`
8. Finally, you can run prices `npm run prices 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255`



## Contract Factories
Add a JSON file with the abi of any new contract to the folder `src/contracts/abis/<protocol-name>`.

Run the following command to generate factories and abis for those contracts automatically:
```
npm run build-types
```

## Protocol Metadata
Static json metadata files can be generated for protocols.

A new entry needs to be added to the `protocolMetadataBuilders` object in `src/adapters/metadataBuilders.ts`.

The key is the entry created for the `Protocol` object.

The value should be of type `ProtocolMetadataBuilders`, which is an object with a `Chain` for key and a `() => Promise<void>` for value.

```
npm run metadata
```

# Contributors ✨

<table>
  <tr>
    <td align="center"><img src="https://avatars.githubusercontent.com/u/32621022?v=4" width="64px;" alt=""/><br /><sub><b>JP</b></td>
    <td align="center"><img src="https://avatars.githubusercontent.com/u/1970725?v=4" width="64px;" alt=""/><br /><sub><b>Bernardo</b></td>
    <td align="center"><img src="https://avatars.githubusercontent.com/u/78349297?v=4" width="64px;" alt=""/><br /><sub><b>Johann</b></td>
  </tr>
</table>