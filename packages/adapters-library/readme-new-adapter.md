# Steps to Build a New Adapter

This is a detailed step-by-step guide on how to create a new adapter.

## 1. Run the adapter CLI command
The following command will start the new adapter CLI.
```
npm run new-adapter
```

## 2. Follow CLI guidelines to create new adapter

### Q1 Protocol key
Enter a name for your protocol in PascalCase, a convention in which the first letter of each word in a compound word is capitalized without spaces or punctuation, e.g., LenderV2, MyProtocolFinance.

### Q2 Protocol id
Enter a name for your protocol in kebab-case, a convention where all letters are lowercase and words are separated by hyphens, e.g., lender-v2, my-protocol-finance.

A value will be suggested based on the first answer, but at this point, it can be edited.

### Q3 Adapter class name
This question is skipped as we have changed the convention to base it on other answers.

### Q4 Chains
Select every chain on which this product is deployed: Ethereum, Optimism, BSC, Polygon, Fantom, Base, Arbitrum, Avalanche, Linea.

### Q5 Product id
Enter a name for your product in kebab-case, e.g., pool, supply, borrow.

### Q6 Building path
Select how you would like to create the adapter. You can either:
- Create it from scratch using the smart adapter builder, which will require additional questions to be answered.
- Create a fork of one of our supported protocols, e.g., UniswapV2, CompoundV2.
- (Coming soon) Copy an existing adapter.

### Q7 Defi asset structure
Select one of the following options
  1. Single ERC20 protocol token (Like stETH)
  2. Multiple ERC20 protocol tokens (Like Aave: aETH, aUSDC, Compound: cETH, cUSDC)
  3. Non fungible token (Like Uniswap V3)
  4. Contract position (Like Morpho)
  5. Other

### Q8 ERC20 standard events
Select if the protocol token contracts are just regular ERC20 tokens with mint, burn, and transfer events.

### Q9 balanceOf
Select if the protocol token contracts have a balanceOf(address) method.

### Q10 Number of underlying
Select if protocol tokens have one (stEth, aEth) or multiple underlying tokens (Curve.fi DAI/USDC/USDT).

### Q11/12 Quantity of underlyings for each protocol token
Select whether one of your protocol tokens maps to a single underlying token, or it can be derived from the total supply, or additional calculations are necessary.

### Q13 Additional rewards
Select whether the product offers additional rewards beyond the primary earnings.

### Q14 Reward details
Select the type of rewards offered by the protocol:
  1. Rewards are linked to DeFi asset (like Curve and Convex)
  2. Extra rewards are linked to DeFi asset (like Curve permissionless rewards)
  3. Protocol rewards like Compound's protocol rewards

## 3. Inspect adapter code and complete missing methods
A set of files would have been generated, one of them being the adapter itself.

### 3.1 Contract factories and types
The next steps involve adding implementation details to the adapter. For that, it might be necessary to add new contract ABIs to create factories that allow a type-safe approach to interacting with those contracts. In order to do so, drop a JSON file with the ABI for each contract in the `contracts/abis` folder of your protocol (e.g., `src/adapters/your-protocol-id/contracts/abis`).

After that, run the following command to generate contract factories that can be imported afterward.
```
npm run build-types
```

### 3.2 Filling implementation gaps for the adapter
Upon inspecting the adapter start by filling details for the following methods
- `getProtocolDetails`
- `buildMetadata`

After implementing `buildMetadata`, create the json metadata files that will be used at runtime by running

```
npm run build-metadata -- -p your-protocol-id
```

Then check if the following methods need to be implemented or code has already been added based on the CLI questions
- `getProtocolTokens`
- `getPositions`
- `unwrap`
- `getWithdrawals`
- `getDeposits`
- `getTotalValueLocked`

Finally, if any reward method has been added, the implementation will have to be provided for it to work:
- `getRewardPositions`
- `getRewardWithdrawals`
- `getExtraRewardPositions`
- `getExtraRewardWithdrawals`

## 4 Use the dev ui to valiate position and profit responses

By accessing the dev ui at `http://localhost:5173/`, it is possible to check both a visual representation of user position and the raw json data returned for debugging purposes.

It just requires adding an ethereum address and filtering by the protocol that is currently being worked on.

## 5 Create snapshot tests
The last step involves creating tests to validate the adapter results and ensure that future changes don't break it.

Inside the protocol folder, there should be a folder called tests and a file called `testCases.ts` (e.g., `src/adapters/your-protocol-id/tests/testCases.ts`). This file exports an array of test cases.

You need to specify the `chain` and `method` for all test cases. Optionally, you can specify a `key` to identify the file, but this is only required if you write more than one test for the same `method` and `chain`.

### 5.1 Positions
To get a snapshot of the positions, you need to set `method: 'positions'` and provide an input field with the `userAddress`. Optionally, you can specify a `blockNumber`, but this is not required, and the latest will be used and recorded if it's left empty. This will run for all the products of this protocol.

Example:
```
{
    chainId: Chain.Ethereum,
    method: 'positions',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
    },
  }
```

### 5.2 Profits
To get a snapshot of the profits, you need to set `method: 'profits'` and provide an `input` field with the `userAddress` and, optionally, `timePeriod`, which will default to one day if left empty. Optionally, you can specify a `blockNumber`, but this is not required, and the latest will be used and recorded if it's left empty. This will run for all the products of this protocol.

Example:
```
{
    chainId: Chain.Ethereum,
    method: 'profits',
    input: {
      userAddress: '0x161D61e30284A33Ab1ed227beDcac6014877B3DE',
    },
  }
```

### 5.3 Deposits/Withdrawals/Repays/Borrows
To get a snapshot of any of these methods, set `method: 'deposits' | 'withdrawals' | 'repays' | 'borrows'`. The input field of these methods requires additional parameters to work, including `userAddress`, `fromBlock`, `toBlock`, `protocolTokenAddress`, and `productId`.

Example:
```
{
    chainId: Chain.Ethereum,
    method: 'deposits',
    input: {
      fromBlock: 198188138,
      toBlock: 200597430,
      userAddress: '0xbc0a54c02a1e80c8e25e8173a8a80baf116205b5',
      protocolTokenAddress: '0x3bAa857646e5A0B475E75a1dbD38E7f0a6742058',
      productId: 'supply',
    },
  },
```

### 5.4 TVL
To get a snapshot of the TVL implementation, set `method: 'tvl'` and specify the protocol tokens with `filterProtocolToken: ['protocol-token-address1', 'protocol-token-address2']`. Optionally, you can specify a `blockNumber`, but this is not required, and the latest will be used and recorded if it's left empty. This will run for all the products of this protocol.

Example:
```
{
    chainId: Chain.Ethereum,
    method: 'tvl',
    filterProtocolTokens: ['0x3bAa857646e5A0B475E75a1dbD38E7f0a6742058'],
  },
```

### 5.5 Create and verify snapshot tests
Once the `testCases` array is populated, run `npm run build-snapshots -- -p your-protocol-id` to generate the output for those tests.

It is then possible to check that those snapshots are valid by running `npm run test:integration --protocol=your-protocol-id`.

## 6 Creating a pull request
Once satisfied with the work done and its results, run the following command to automatically fix any linting errors and get a report of those that need manual intervention.

```
npm run fix
```

After that, create a pull request against our upstream repository, go through the checklist in the template and verify that all checkboxes that apply have been checked.

Please make sure you allow repository owners to make amends to your branch.
