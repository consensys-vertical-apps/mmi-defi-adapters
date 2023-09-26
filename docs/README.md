<p align="center">
  <img src="https://images.ctfassets.net/9sy2a0egs6zh/2XUXAYxxFFVjPlZABUoiLg/d0ff82237d3e5d9bd1097a98e0754453/MMI-icon.svg" width="500">
</p>

# Welcome to our DeFi Adapter Library! 🚀

This library is designed to simplify and standardize the process of fetching and interacting with data from various DeFi protocols, which often have unique interfaces and data structures. Our adapters fetch and transform underlying protocol data into a standardized format that can be easily used by portfolio dashboards.

## Our Goals 🎯

1. Connect users with DeFi protocols
2. Benefit the wider ecosystem
3. Simplify and standardize adapter building
4. Provide the following data in a standardized format:
   - DeFi positions by address, including the balance of underlying tokens such as USDC, WETH, etc.
   - Total Value Locked (TVL) by pool
   - APY/APR by pool
   - Daily profit and loss by address
   - Price of LP token
   - Deposits by address
   - Withdrawals by address
   - Claimed rewards by address

## Documentation 📖

Detailed documentation for the interfaces and functions can be found [here](./docs/interfaces/IProtocolAdapter.md).

## Overview of this library

From left to right, get-onchain-data and convert to standardize format.

![Alt text](high-level.png)

## Overview of getPositions function

![Alt text](get-positions.png)

## Getting Started 🏁

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Requirements

- Node v18

### Quick Start

To run the project and execute adapters in default mode with our test addresses, follow these steps:

1. Create a copy of `.env.example` as `.env`.
2. Install the necessary packages with `npm i`
3. Build the project with `npm run build:watch`
4. Run the following commands to execute various functions:
   - `npm run positions`
   - `npm run profits`
   - `npm run tvl`
   - `npm run prices`
   - `npm run apr`
   - `npm run apy`
   - `npm run withdrawals`
   - `npm run deposits`

## Installation

Create a copy of `.env.example` as `.env` and run `npm i` to install the necessary packages.

## Building

Use `npm run build` to build the app once, or `npm run build:watch` to constantly build the app during development.

# Running the App 🏃‍♂️

### CLI Help

To get specific details on available commands, run `npm run adapters-cli`. For arguments and options for specific commands, use `npm run positions -- --help`.

### Filtering

You can get results for specific protocols and chains for every command by adding `--chains <chains>` and/or `--protocols <protocols>`. Values can be provided individually or as a comma-separated array.

For example, `npm run positions 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255 -- --protocol stargate --chain 1,arbitrum`.

### Get Positions

To get positions, run `npm run positions 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255`.

### Get PnL

To get profit and loss, run `npm run profits 0xB0D502E938ed5f4df2E681fE6E419ff29631d62b`.

### Get Price Per Share

To get price per share, run `npm run prices`.

### Get Total Value Locked (TVL)

To get TVL, run `npm run tvl`.

### Get APR

To get APR, run `npm run apr`.

### Get APY

To get APY, run `npm run apy`.

### Get Deposits

To get deposits, run `npm run deposits 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255 17719334 17719336`.

### Get Withdrawals

To get withdrawals, run `npm run withdrawals 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255 17719334 17719336`.

## Adding a new Adapter (CLI)

Run the following command to add a new adapter `npm run new-adapter`

This will start an interactive process in the command line to create a new adapter. Running `npm run new-adapter -- --help` shows available options for defaults.

## Adding a New Protocol or Adapter manually

See [NON-CLI-ADAPTER.md](NON-CLI-ADAPTER).

## Contract Factories

Add a JSON file with the ABI of any new contract to the folder `src/contracts/abis/<protocol-name>`. Run `npm run build-types` to generate factories and ABIs for those contracts automatically.

## Test Snapshots

In order to maintain integrity, it is possible to create test snapshots.

Tests can be added to `src/adapters/<protocol-name>/tests/testCases.ts` by adding them to the exported `testCases` array. The test object is fully typed.

A test needs to include:

- `chainId`: Chain for which the test will run
- `method`: One of the available public methods of the library
- `input`: If the test `method` requires input, such as an user address, it needs to be specified here.
- `blockNumber`: For some tests, it is possible to specify which block number should be used. If it's not provided, the snapshot will be created with the latest block number, which will be stored along with the snapshot.
- `key`: When there are multiple tests for the same `chainId` and `method`, but with different inputs (e.g. testing multiple user addresses), a key is necessary for the system to identify them.

Once the tests are defined, running `npm run build-snapshots -- -p <protocol-name>` will generate snapshots for them.

Running `npm run test` validates snapshots match results.

### Versioning and Publishing (internal use only)

To version and publish:

1. Create a pull request with your changes.
2. Apply one of the labels: `major`, `minor`, `patch`, `premajor`, `preminor`, `prepatch`, or `prerelease` to the pull request. This label will determine how the package version is bumped.
3. Once your pull request is approved, merge it into `main`.
4. The GitHub Action workflow will automatically bump the package version based on the label, push the new version and associated tag, and then publish the package.

Please note: You no longer need to manually bump the package version or push tags.

### Update Average Blocks Per Day (internal use only)

To update all averages, run `npm run adapters-cli block-average`. To update a specific chain, run `npm run adapters-cli block-average -- --chain 1`.

## Contributors 🫡

<table>
  <tr>
    <td align="center"><a href="https://github.com/username1"><img src="https://avatars.githubusercontent.com/u/78349297?v=4" width="100" style="border-radius:50%"><br><sub><b>Johann</b></sub></a></td>
    <td align="center"><a href="https://github.com/username2"><img src="https://avatars.githubusercontent.com/u/1970725?v=4" width="100" style="border-radius:50%"><br><sub><b>Bernardo</b></sub></a></td>
    <td align="center"><a href="https://github.com/username3"><img src="https://avatars.githubusercontent.com/u/32621022?v=4" width="100" style="border-radius:50%"><br><sub><b>JP</b></sub></a></td>
  </tr>
</table>
