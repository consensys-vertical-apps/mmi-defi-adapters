<p align="center">
  <img src="https://images.ctfassets.net/9sy2a0egs6zh/2XUXAYxxFFVjPlZABUoiLg/d0ff82237d3e5d9bd1097a98e0754453/MMI-icon.svg" width="500">
</p>

# Welcome to our DeFi Adapter Library! 🚀

This library is designed to simplify and standardise the process of fetching data and interacting with various DeFi protocols, which often have unique interfaces and data structures. Our adapters 1) fetch and transform underlying protocol data into a standardised format that can be easily used by portfolio dashboards and 2) generate transaction params to create and update protocol positions.

[How to create a Read Adapter](./packages/adapters-library/README.md#how-to-create-a-read-adapter)

[How to create a Write Adapter](./packages/adapters-library/README.md#how-to-create-a-write-adapter)

## Quick Start
Refer to the [adapters-library README](./packages/adapters-library/README.md#setup-steps).

> **Note:** Please note that in this library, adapter must query on-chain data to ensure accuracy and reliability, we do not accept centralised APIs to get positions, withdrawals, deposits, profits or rewards. 
