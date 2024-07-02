<p align="center">
  <img src="https://images.ctfassets.net/9sy2a0egs6zh/2XUXAYxxFFVjPlZABUoiLg/d0ff82237d3e5d9bd1097a98e0754453/MMI-icon.svg" width="500">
</p>

# Welcome to our DeFi Adapter Library! 🚀

This library is designed to simplify and standardise the process of fetching data and interacting with various DeFi protocols, which often have unique interfaces and data structures. Our adapters 1) fetch and transform underlying protocol data into a standardised format that can be easily used by portfolio dashboards and 2) generate transaction params to create and update protocol positions.

> **Note:** Please note that in this library, adapters must query on-chain data to ensure accuracy and reliability, we do not accept centralised APIs to get positions, withdrawals, deposits, profits or rewards. 

## How to create a Read Adapter


### Setup steps

Watch the [setup video](https://drive.google.com/file/d/1bp9Y8uxQDYxgIyMTk5945vLOwCG1JOn3/view "Watch the setup video") for a detailed guide.

1. Install:
   - `nvm use` to select the environment
   - `npm i` to install dependencies 
2. Run project:
   - `npm run dev` to run the project

Continue watching videos for the following steps or, alternatively, find a written version in [Steps to create a read adapter](./readme-new-adapter.md)

### Build adapter steps

Watch the [build adapter video](https://drive.google.com/file/d/1Pl0yB2d1s-3oKFCXAyRhKx7rK2x43Qtf/view  "Watch the build adapter steps") for a detailed guide.

3. Use CLI:
   - `npm run new-adapter` this launches our interactive CLI that will prompt you with a series of questions
### Inspect your automatically created adapter file and implement unfinished methods

Watch the [inspect your adapter video](https://drive.google.com/file/d/1wLTd8utKB3vXHd-Vr2Cv1ElpLYHpPXCX/view "Watch the inspect your adapter") for a detailed guide.

### Build Smart Contract Classes from ABIs

Watch the [build contract classes from ABIs video](https://drive.google.com/file/d/1abo6lKGGTnNMKgvfiDPotFWUvey8UqZI/view "Watch the build contract classes from ABIs") for a detailed guide.

4. Save a json file with your abi and add it to your ${protocolName}/contracts/abis/ folder 
5. Run:
   - `npm run build-types` to generate your smart contract classes
### Build your DeFi asset metadata files

Watch the [build your DeFi asset metadata files video](https://drive.google.com/file/d/1QfI5ZIg2-lkw2KqNypZo0G5ySye0o0WC/view "Watch the build your DeFi asset metadata files") for a detailed guide.

6. Implement the buildMetadata function in your adapter.
7. Run:
   - `npm run build-metadata -- -p <protocol-id>` to create your metadata files
### Build your Snapshot tests

Watch the [build your snapshot tests video](https://drive.google.com/file/d/1pVWcssMHTQBH-m_BjVTwpRKamIY6UUK9/view  "Watch the build your snapshot tests") for a detailed guide.

8. Populate your test cases file.
6. Run:
   - `npm run build-snapshots -- -p <protocol-id>` to build your snapshot tests

## How to create a Write Adapter

The tutorial video below shows an intro to on how to add write adapter actions to an existing read adapter:

Don't have a read adapter? And don't intend to create a read adapter? Then:

1. Select "WriteOnlyAdapterTemplate" on our new-adapter CLI. See section "Build adapter steps" above for more information.
2. Implement the buildMetadata() method see section "Build your DeFi asset metadata files" above for more information.
3. Then follow the video tutorial below:

Watch the [build write adapter video](https://drive.google.com/file/d/1ZNWwOkzHlc7Zt2qLy5ZRuHqoDgWSnww7/view  "Watch the build write adapter video") for a detailed guide.

Example code for write-adapters, as described in the above video:

```
export const WriteActionInputs = {
  [WriteActions.Deposit]: z.object({
    asset: z.string(),
    amount: z.string(),
    onBehalfOf: z.string(),
    referralCode: z.number(),
  }),
  [WriteActions.Withdraw]: z.object({
    asset: z.string(),
    amount: z.string(),
    to: z.string(),
  }),
} satisfies WriteActionInputSchemas
```

```
async getTransactionParams({
  action,
  inputs,
}: Extract<
  GetTransactionParams,
  { protocolId: typeof Protocol.YourProtocolKey; productId: 'YourProductId' }
>): Promise<{ to: string; data: string }> {
  switch (action) {
    case WriteActions.Deposit: {
      const { asset, amount, onBehalfOf, referralCode } = inputs
      return poolContract.supply.populateTransaction(
        asset,
        amount,
        onBehalfOf,
        referralCode,
      )
    }
    case WriteActions.Withdraw: {
      const { asset, amount, to } = inputs
      return poolContract.withdraw.populateTransaction(asset, amount, to)
    }
  }
}
```