import { Chain, Protocol } from '@metamask-institutional/defi-adapters'
import { getAddress } from 'ethers'
import { type ZodTypeAny, z } from 'zod'

export const IsEthAddress = z
  .string()
  .refine((address) => /^0x[0-9a-fA-F]{40}$/.test(address), {
    message: 'Invalid ethereum address',
  })
  .transform((address) => getAddress(address.toLowerCase()))

const parseAndCheck = <T extends ZodTypeAny>(schema: T) => {
  return z
    .string()
    .optional()
    .transform((val: string | undefined) => {
      if (val === undefined) return undefined
      try {
        return JSON.parse(val)
      } catch {
        return val
      }
    })
    .pipe(schema)
}

export const GetPositionsParamsSchema = z
  .object({
    userAddress: IsEthAddress,
  })
  .strict()

export const GetPositionsQuerySchema = z
  .object({
    filterProtocolIds: parseAndCheck(
      z.array(z.nativeEnum(Protocol)).optional(),
    ),
    filterProductIds: parseAndCheck(z.array(z.string()).optional()),
    filterChainIds: parseAndCheck(z.array(z.nativeEnum(Chain)).optional()),
    blockNumbers: parseAndCheck(z.record(z.string(), z.number()).optional()),
    filterProtocolTokens: parseAndCheck(z.array(z.string()).optional()),
    filterTokenIds: parseAndCheck(z.array(z.string()).optional()),
  })
  .strict()

export const GetSupportQuerySchema = z.object({
  filterProtocolIds: parseAndCheck(z.array(z.nativeEnum(Protocol))).optional(),
  filterChainIds: parseAndCheck(z.array(z.nativeEnum(Chain)).optional()),
  includeProtocolTokens: parseAndCheck(z.boolean().optional()),
})
