<h1 align="center" style="border-bottom: none">
    <b>
        <a href="https://images.ctfassets.net/9sy2a0egs6zh/2XUXAYxxFFVjPlZABUoiLg/d0ff82237d3e5d9bd1097a98e0754453/MMI-icon.svg">
            <img alt="Defi Lambdas" width="408px" src="https://images.ctfassets.net/9sy2a0egs6zh/2XUXAYxxFFVjPlZABUoiLg/d0ff82237d3e5d9bd1097a98e0754453/MMI-icon.svg" />
        </a><br>
    </b>
</h1>

# Introduction

Welcome to our defi-adapter library, often defi-protocols have their own unique interfaces and data structures posing challenges while fetching or interacting with them.
This library of adapters takes care of fetching and transforming underlying protocol data into a standardized format which can be used by portfolio dashboards.

Our goal is to (i) connect users with DeFi protocols (ii) benefit the wider ecosystem (iii) simplify and standardize adapters building (iv) provide the following data in a standardized format:

- Defi positions by address. Results should include the balance of the underlying token(s) such as USDC, WETH etc.
- Total value locked by pool
- APY/APY by pool
- Daily profit and loss by address
- Price of LP token
- Deposits by address
- Withdrawals by address
- Claimed rewards by address

## Overview of this library

From left to right, get onchain data and standardize.

![Alt text](high-level.png)

## Overview of getPositions function

![Alt text](get-positions.png)

# Getting Started

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Requirements

- Node v18

## Quick start

To run project and run adapters in default mode with our test addresses follow the below.

```
1 . Create a copy of `.env.example` as `.env`.
2. npm i
3. npm run build:watch
4. npm run positions
5. npm run profits
6. npm run tvl
7. npm run prices
8. npm run apr
9. npm run apy
10. npm run withdrawals
11. npm run deposits

```

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

## CLI help

Specific details on what commands are available can be shown running:

```
npm run adapters-cli
```

For getting the arguments and options for specific commands:

```
npm run positions -- --help
```

## Filtering

It is possible to get results for specific protocols and chains for every command by adding `--chain <chainId>` and/or `--protocol <protocolName>`

For example:

```
npm run positions 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255 -- --protocol stargate --chain 1
```

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

## Get APR

```
npm run apr
```

## Get APY

```
npm run apy
```

## Get deposits

```
npm run deposits 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255 17719334 17719336
```

## Get withdrawals

```
npm run withdrawals 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255 17719334 17719336
```

## Update Average blocks per day

Run the following command to update all averages

```
npm run adapters-cli block-average
```

Run the following command to update a specific chain

```
npm run adapters-cli block-average -- --chain 1
```

# Repo topology

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

## Adding a new Adapter (CLI)

Run the following command to add a new adapter

```
npm run new-adapter <Example> <example-product> [Chains]
```

Where:

- `<Example>` is the name of your protocol as you'd like it to appear.
- `<example-product>` is the name of the product for the adapter in kebab-case
- `[Chains]` is an optional argument with a comma separated list of supported chains (e.g. `Ethereum,Arbitrum,Optimism`). Default: `Ethereum`

## Adding a New Protocol or Adapter manually

See [NON-CLI-ADAPTER.md](NON-CLI-ADAPTER).

## Contract Factories

Add a JSON file with the abi of any new contract to the folder `src/contracts/abis/<protocol-name>`.

Run the following command to generate factories and abis for those contracts automatically:

```
npm run build-types
```

## Versioning and Publishing (internal use only)

On your branch, bump the package version by running the below. The publish_ci pipeline will automatically-run when merged to main.

npm version [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease | from-git]

```
npm version patch
git push
```

# Contributors ✨

<table>
  <tr>
    <td align="center"><img src="https://avatars.githubusercontent.com/u/32621022?v=4" width="64px;" alt=""/><br /><sub><b>JP</b></td>
    <td align="center"><img src="https://avatars.githubusercontent.com/u/1970725?v=4" width="64px;" alt=""/><br /><sub><b>Bernardo</b></td>
    <td align="center"><img src="https://avatars.githubusercontent.com/u/78349297?v=4" width="64px;" alt=""/><br /><sub><b>Johann</b></td>
  </tr>
</table>
