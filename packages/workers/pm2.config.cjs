module.exports = {
  apps: [
    {
      name: 'Ethereum',
      script: 'node',
      args: ['packages/workers/dist/main.js'],
      env: {
        CHAIN_ID: '1',
      },
    },
    {
      name: 'Optimism',
      script: 'node',
      args: ['packages/workers/dist/main.js'],
      env: {
        CHAIN_ID: '10',
      },
    },
    // {
    //   name: 'Bsc',
    //   script: 'node',
    //   args: ['packages/workers/dist/main.js'],
    //   env: {
    //     CHAIN_ID: '56',
    //   },
    // },
    {
      name: 'Polygon',
      script: 'node',
      args: ['packages/workers/dist/main.js'],
      env: {
        CHAIN_ID: '137',
      },
    },
    // {
    //   name: 'Fantom',
    //   script: 'node',
    //   args: ['packages/workers/dist/main.js'],
    //   env: {
    //     CHAIN_ID: '250',
    //   },
    // },
    {
      name: 'Base',
      script: 'node',
      args: ['packages/workers/dist/main.js'],
      env: {
        CHAIN_ID: '8453',
      },
    },
    {
      name: 'Arbitrum',
      script: 'node',
      args: ['packages/workers/dist/main.js'],
      env: {
        CHAIN_ID: '42161',
      },
    },
    {
      name: 'Avalanche',
      script: 'node',
      args: ['packages/workers/dist/main.js'],
      env: {
        CHAIN_ID: '43114',
      },
    },
    {
      name: 'Linea',
      script: 'node',
      args: ['packages/workers/dist/main.js'],
      env: {
        CHAIN_ID: '59144',
      },
    },
  ],
}
