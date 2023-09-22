export const Protocol = {
  Stargate: 'stargate',
  Example: 'example',
  AaveV2: 'aave-v2',
} as const
export type Protocol = (typeof Protocol)[keyof typeof Protocol]
