## **Description**

<!--
Write a short description of the changes included in this pull request. Include relevant links to the protocol docs
-->

## **Pre-merge author checklist**

- [ ] A brief description of the protocol and adapters is added to the PR
- [ ] Contracts used are verified for that chain block explorer
- [ ] Test cases with a block number have been added to the `testCases.ts` file for every relevant method that has been implemented
  - [ ] positions
  - [ ] prices
  - [ ] deposits
  - [ ] withdrawals
  - [ ] profits
  - [ ] tvl
  - [ ] apr
  - [ ] apy
- [ ] For every adapter that extends `SimplePoolAdapter`
  - [ ] `getPositions` is not overwritten and, if it is, it's clearly explained why in the PR
  - [ ] `getProtocolTokenToUnderlyingTokenRate` is not overwritten and, if it is, it's clearly explained why in the PR
- [ ] If the adapters requires to fetch static data on-chain (e.g. pool ids, token metadata, etc)
  - [ ] The adapter implements `IMetadataBuilder`
  - [ ] The `buildMetadata` method is implemented with the `@CacheToFile` decorator
  - [ ] All the static data is stored within the metadata JSON file
- [ ] `update me` comments are removed
- [ ] Files outside the protocol folder are not being edited and, if they are, it's clearly explained why in the PR
- [ ] `getAddress` from `ethers`
  - [ ] Is used to parse hardcoded addresses
  - [ ] Is used to parse addresses that come from contract calls when it is not clear they'll be in checksum format
  - [ ] It is NOT used to parse addresses from input methods
  - [ ] It is NOT used to parse addresses from metadata
