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

## 🎥 DeFi Adapter Tutorial

Check out the tutorial video below for an intro to our library and how to build an adapter:

[![DeFi Adapter Tutorial](video-thumbnail.png)](https://drive.google.com/file/d/1EL5PEOQa_OgscANi3mAxBXdT25LqMsKv/view)

## Quick Start

This project requires Node 20. Ensure you're using the correct version (e.g. run `nvm use`)

To build an adapter follow these steps:

1. Install the necessary packages with `npm i`
2. Build the project with `npm run build:watch`
3. To build an adapter run:
   - `npm run new-adapter`
4. To create a typescript-smart-contract class create a json file with your abi and add it to your ${protocolName}/contracts/abis/ folder, then run:
   - `npm run build-types`
5. To build metadata files run (replace \<protocol-id> with the id of your protocol):
   - `npm run build-metadata -- -p <protocol-id>`
6. To build snapshot tests run (replace \<protocol-id> with the id of your protocol):
   - `npm run build-snapshots -- -p <protocol-id>`
7. To run tests run:
   - `npm run test`
8. To test your adapter further you can use the following commands, update userAddress and other params accordingly:
   - `npm run positions 0x6b8Be925ED8277fE4D27820aE4677e76Ebf4c255 -- --protocols stargate --chains 1,arbitrum`
   - `npm run profits 0xCEadFdCCd0E8E370D985c49Ed3117b2572243A4a`
   - `npm run tvl`
   - `npm run prices`
   - `npm run apr`
   - `npm run apy`
   - `npm run deposits 0x30cb2c51fc4f031fa5f326d334e1f5da00e19ab5 18262162 18262164 0xC36442b4a4522E871399CD717aBDD847Ab11FE88 pool uniswap-v3 1 573046`
   - `npm run withdrawals 0x4Ffc5F22770ab6046c8D66DABAe3A9CD1E7A03e7 17979753 17979755 0xdf0770df86a8034b3efef0a1bb3c889b8332ff56 pool stargate 1`

## Documentation 📖

Detailed documentation on the adapter methods can be found [here](./docs/interfaces/IProtocolAdapter.IProtocolAdapter.md).

## Portfolio dashboard

The DeFi adapter library is the engine behind MetaMask's retail and institutional portfolio dashboards 🦊.

In this example, the user holds positions in both Stargate and Uniswap.

![Alt text](dashboard.png)

## Example adapter user story

> ## User Story: Implement New DeFi Adapter for [Your Protocol Name]
>
> **As a** adapter developer,  
> **I want to** implement a new DeFi adapter that follows the IProtocolAdapter interface,  
> **So that** MMI and MetaMask Portfolio users can view in-depth data related to their positions.
>
> ---
>
> ### Acceptance Criteria:
>
> 1. **Multiple Products Consideration:** Ensure that protocols with multiple products (e.g., farming, staking, pools) are supported by one adapter each.
> 2. **Adapter Implementation:** Successfully add a new DeFi adapter implementing the IProtocolAdapter to support the product.
> 3. **Add Adapter using CLI:**
>    - Follow instructions in the "Adding a new Adapter (CLI)" section of the readme.
> 4. **Ethers Contracts Creation:**
>    - Create ethers contracts to interact with the smart contracts of the protocol.
>    - Refer to the "Contract Factories" section in the readme for guidance.
> 5. **LP Token Metadata Building:** Implement the `buildMetadata()` logic in the adapter to retrieve the LP token reference data and run `npm run build-metadata`. (e.g., Check out the `buildMetadata()` method in the [`StargatePoolAdapter` class](https://github.com/consensys-vertical-apps/mmi-DeFi-adapters/blob/main/src/adapters/stargate/products/pool/stargatePoolAdapter.ts).
>    [output example](src/adapters/stargate/products/pool/metadata/ethereum.lp-token.json)).
> 6. **Testing:** Test the adapter(s) using the commands specified in the readme.
>
> ---
>
> ### Additional Notes/Comments:
>
> The IProtocolAdapter interface has been documented with TSDocs, detailed descriptions of the methods and properties can be found [here](./docs/interfaces/iProtocolAdapter.IProtocolAdapter.md).

## FAQ section

1. What is a DeFi adapter?

   A DeFi adapter is code that standardizes DeFi protocol data and positions, allowing for consistent data retrieval and interaction. It acts as a connector (a.k.a translator) between our dashboards and your DeFi products.

2. What do these adapters do?

   They power the MetaMask portfolio dashboards, displaying users' DeFi positions.

3. What experience do I need to map an adapter?

   Ideally experience in Typescript, Ethers library, and be familiar with the DeFi protocol.

4. Are these adapters deployed onchain?

   No this adapter library is installed and deployed in microservices. The adapters are written in TypeScript (not solidity).

5. I'm not familiar with the protocol. Can I still map an adapter?

   Yes. To assist you refer to the protocol docs, smart contracts, find example open positions and review deposits and withdrawals to the position.

6. How long does it take to map an adapter?

   A few hours for those with knowledge of Typescript, Ethers, and the DeFi protocol.

7. What is the getProfits method?

   It returns profit on individual open positions by considering weekly changes and transactions in and out of the position.

8. How do you calculate profits?

   - We capture users' positions from 7 days ago using the `get positions` adapter method with a `blocknumber override`.
   - We then obtain the current positions.
   - To account for deposits and withdrawals in this period, we examine `mint` and `burn` events of LP tokens and convert these back to underlying tokens.
   - We found this method works for the majority of protocols. However, adapt as necessary for your protocol. For example, if there are better event logs available for your protocol, use them.

9. Some adapter methods don't make sense for my DeFi-protocol?

   Throw an error: new Error('Does not apply').

10. Can I use an API for results?

    We recommend getting data directly from the blockchain over centralized APIs.

11. My protocol only has a few pools, can I hardcode the buildMetadata() result?

    Yes. Feel free to hardcode this result if it doesn't make sense to fetch pool data on chain.

12. My protocol has more than one product, should I create separate adapters?

    Yes. We find this reduces complexity.

13. Im getting `>> TypeError: Cannot read properties of undefined (reading 'F_OK')` error when running `npm run new-adapter`

Make sure you are using Node 20. Run `nvm use`

13. How can I share feedback or proposals?

    Please reach out to us directly. We value feedback.

## Overview of this library

From left to right, get-onchain-data and convert to standardize format.

![Alt text](high-level.png)

## Getting Started 🏁

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Requirements

- Node v20

### CLI Help

To get specific details on available commands, run `npm run adapters-cli`. For arguments and options for specific commands, use `npm run positions -- --help`.

## Adding a new Adapter (CLI)

This project requires Node 18. Ensure you're using the correct version (e.g. run `nvm use`)

Run the following command to add a new adapter `npm run new-adapter`

This will start an interactive process in the command line to create a new adapter. Running `npm run new-adapter -- --help` shows available options for defaults.

## Contract Factories

Add a JSON file with the ABI of any new contract to the folder `src/adapter/<protocol-name>/contracts/abis`. Run `npm run build-types` to generate factories and ABIs for those contracts automatically.

## Test Snapshots

In order to maintain integrity, it is possible to create test snapshots.

Tests can be added to `src/adapters/<protocol-name>/tests/testCases.ts` by adding them to the exported `testCases` array. The test object is fully typed.

A test needs to include:

- `chainId`: Chain for which the test will run
- `method`: One of the available public methods of the library
- `input`: If the test `method` requires input, such as an user address, it needs to be specified here.
- `blockNumber`: For some tests, it is possible to specify which block number should be used. If it's not provided, the snapshot will be created with the latest block number, which will be stored along with the snapshot.
- `key`: When there are multiple tests for the same `chainId` and `method`, but with different inputs (e.g. testing multiple user addresses), a key is necessary for the system to identify them.

Once the tests are DeFined, running `npm run build-snapshots -- -p <protocol-name>` will generate snapshots for them.

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
