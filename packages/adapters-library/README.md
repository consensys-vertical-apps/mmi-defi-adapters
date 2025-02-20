<p align="center">
  <img src="https://images.ctfassets.net/9sy2a0egs6zh/2XUXAYxxFFVjPlZABUoiLg/d0ff82237d3e5d9bd1097a98e0754453/MMI-icon.svg" width="500">
</p>

# Welcome to our DeFi Adapter Library! 🚀

This library is designed to simplify and standardise the process of fetching data and interacting with various DeFi protocols, which often have unique interfaces and data structures. Our adapters 1) fetch and transform underlying protocol data into a standardised format that can be easily used by portfolio dashboards and 2) generate transaction params to create and update protocol positions.

> **Note:** Please note that in this library, adapters must query on-chain data to ensure accuracy and reliability, we do not accept centralised APIs to get positions or rewards.

## How to create a Read Adapter

### Setup steps

Watch the [setup video](https://drive.google.com/file/d/1bp9Y8uxQDYxgIyMTk5945vLOwCG1JOn3/view 'Watch the setup video') for a detailed guide.

1. Install:
   - `nvm use` to select the environment
   - `npm i` to install dependencies
   - `npm run build` to build the CLI
2. Run project:
   - `npm run dev` to run the project

Continue watching videos for the following steps or, alternatively, find a written version in [Steps to create a read adapter](./readme-new-adapter.md)

### Build adapter steps

Watch the [build adapter video](https://drive.google.com/file/d/1Pl0yB2d1s-3oKFCXAyRhKx7rK2x43Qtf/view 'Watch the build adapter steps') for a detailed guide.

3. Use CLI:
   - `npm run new-adapter` this launches our interactive CLI that will prompt you with a series of questions

### Inspect your automatically created adapter file and implement unfinished methods

Watch the [inspect your adapter video](https://drive.google.com/file/d/1wLTd8utKB3vXHd-Vr2Cv1ElpLYHpPXCX/view 'Watch the inspect your adapter') for a detailed guide.

### Build Smart Contract Classes from ABIs

Watch the [build contract classes from ABIs video](https://drive.google.com/file/d/1abo6lKGGTnNMKgvfiDPotFWUvey8UqZI/view 'Watch the build contract classes from ABIs') for a detailed guide.

4. Save a json file with your abi and add it to your ${protocolName}/contracts/abis/ folder
5. Run:
   - `npm run build-types` to generate your smart contract classes

### Build your DeFi asset metadata

Watch the [build your DeFi asset metadata video](https://drive.google.com/file/d/1F6AnSkhd9Iu7f62f3VcAJ60iHZfAib1B/view 'Watch the build your DeFi asset metadata') for a detailed guide.

6. Implement the `getProtocolToken` method in your adapter and make sure it is decorated with `@CacheToDb`.

- If the adapter requires additional metadata. The `AdditionalMetadata` type should be updated accordingly, otherwise it should be deleted.
- You can add any data that is serializable as JSON (including BigInt) as additional metadata.
- There are four protected fields that, if added, must adhere to stricter types. Those are:

```
{
  underlyingTokens?: Erc20ExtendedMetadata[]
  rewardTokens?: Erc20ExtendedMetadata[]
  extraRewardTokens?: Erc20ExtendedMetadata[]
  tokenId?: string
}
```

7. Run:
   - `npm run build-metadata-db -- -p <protocol-id> -pd <product-id>` to create your metadata files

### Build your Snapshot tests

Watch the [build your snapshot tests video](https://drive.google.com/file/d/1pVWcssMHTQBH-m_BjVTwpRKamIY6UUK9/view 'Watch the build your snapshot tests') for a detailed guide.

8. Populate your test cases file.
9. Run:
   - `npm run build-snapshots -- -p <protocol-id>` to build your snapshot tests
