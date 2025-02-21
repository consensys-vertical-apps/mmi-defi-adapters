module.exports = {
  apps: [
    {
      name: 'Ethereum',
      script: 'node',
      args: ['packages/workers/dist/main.js', '1'],
    },
    {
      name: 'Optimism',
      script: 'node',
      args: ['packages/workers/dist/main.js', '10'],
    },
    // {
    //   name: 'Bsc',
    //   script: 'node',
    //   args: ['packages/workers/dist/main.js', '56'],
    // },
    {
      name: 'Polygon',
      script: 'node',
      args: ['packages/workers/dist/main.js', '137'],
    },
    // {
    //   name: 'Fantom',
    //   script: 'node',
    //   args: ['packages/workers/dist/main.js', '250'],
    // },
    {
      name: 'Base',
      script: 'node',
      args: ['packages/workers/dist/main.js', '8453'],
    },
    {
      name: 'Arbitrum',
      script: 'node',
      args: ['packages/workers/dist/main.js', '42161'],
    },
    {
      name: 'Avalanche',
      script: 'node',
      args: ['packages/workers/dist/main.js', '43114'],
    },
    {
      name: 'Linea',
      script: 'node',
      args: ['packages/workers/dist/main.js', '59144'],
    },
  ],
}
