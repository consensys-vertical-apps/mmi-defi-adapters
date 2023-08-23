export const Protocol = {
  Stargate: 'stargate',
  Example: 'example',
} as const
export type Protocol = (typeof Protocol)[keyof typeof Protocol]
