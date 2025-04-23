import {
  Chain,
  PositionType,
  Protocol,
  TokenType,
} from '@metamask-institutional/defi-adapters'
import { getAddress } from 'ethers'
import { type ZodTypeAny, z } from 'zod'

export const IsEthAddress = z
  .string()
  .refine((address) => /^0x[0-9a-fA-F]{40}$/.test(address), {
    message: 'Invalid ethereum address',
  })
  .transform((address) => getAddress(address.toLowerCase()))

const StringToJSONSchema = z.string().transform((str, ctx): unknown => {
  try {
    return JSON.parse(str)
  } catch (_) {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON' })
    return z.NEVER
  }
})

const parseAndCheck = <T extends ZodTypeAny>(schema: T) => {
  return z
    .string()
    .optional()
    .transform((str) => {
      if (!str) {
        return undefined
      }

      return StringToJSONSchema.parse(str)
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
      z.array(z.nativeEnum(Protocol)),
    ).optional(),
    filterProductIds: parseAndCheck(z.array(z.string())).optional(),
    filterChainIds: parseAndCheck(z.array(z.nativeEnum(Chain))).optional(),
    blockNumbers: parseAndCheck(z.record(z.string(), z.number())).optional(),
    filterProtocolTokens: parseAndCheck(z.array(z.string())).optional(),
    filterTokenIds: parseAndCheck(z.array(z.string())).optional(),
  })
  .strict()

export const GetSupportQuerySchema = z.object({
  filterProtocolIds: parseAndCheck(z.array(z.nativeEnum(Protocol))).optional(),
  filterChainIds: parseAndCheck(z.array(z.nativeEnum(Chain))).optional(),
  includeProtocolTokens: parseAndCheck(z.boolean()).optional(),
})

const ProtocolDetailsSchema = z.object({
  chainId: z.nativeEnum(Chain),
  chainName: z.string(),
  protocolId: z.nativeEnum(Protocol),
  productId: z.string(),
  positionType: z.nativeEnum(PositionType),
  name: z.string(),
  description: z.string(),
  iconUrl: z.string().optional(),
  siteUrl: z.string(),
  protocolDisplayName: z.string(),
  metadata: z
    .object({
      groupPositions: z.boolean().optional(),
    })
    .optional(),
})

const TokenSchema = z.object({
  address: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  balanceRaw: z.string(),
  balance: z.number(),
})

const BaseUnderlyingTokenSchema = z
  .object({
    ...TokenSchema.shape,
    type: z.enum([TokenType.Underlying, TokenType.UnderlyingClaimable]),
    price: z.number(),
    iconUrl: z.string(),
  })
  .openapi({
    type: 'object',
    description: 'Base underlying token information',
  })

type UnderlyingTokenSchema = z.infer<typeof BaseUnderlyingTokenSchema> & {
  tokens?: UnderlyingTokenSchema[]
}

const UnderlyingTokenSchema: z.ZodType<UnderlyingTokenSchema> = z
  .object({
    ...BaseUnderlyingTokenSchema.shape,
    tokens: z.lazy(() => UnderlyingTokenSchema.array().optional()),
  })
  .openapi({
    type: 'object',
    description: 'Underlying token with optional nested tokens',
  })

const ProtocolTokenSchema = z.object({
  ...TokenSchema.shape,
  type: z.literal(TokenType.Protocol),
  tokens: z.array(UnderlyingTokenSchema),
})

const SuccessResponseSchema = z.object({
  ...ProtocolDetailsSchema.shape,
  chainName: z.string(),
  protocolDisplayName: z.string(),
  success: z.literal(true),
  tokens: z.array(ProtocolTokenSchema),
})

const ErrorResponseSchema = z.object({
  ...ProtocolDetailsSchema.shape,
  chainName: z.string(),
  protocolDisplayName: z.string(),
  success: z.literal(false),
  error: z.object({
    message: z.string(),
    details: z.any().optional(),
  }),
})

export const GetPositionsResponseSchema = z.array(
  z.discriminatedUnion('success', [SuccessResponseSchema, ErrorResponseSchema]),
)
export type GetPositionsResponseSchema = z.infer<
  typeof GetPositionsResponseSchema
>

export const GetSupportResponseSchema = z.record(
  z.nativeEnum(Protocol),
  z.object({
    protocolDetails: ProtocolDetailsSchema,
    chains: z.array(z.nativeEnum(Chain)),
  }),
)
export type GetSupportResponseSchema = z.infer<typeof GetSupportResponseSchema>

export const ValidationErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    issues: z.array(
      z.object({
        code: z.string(),
        message: z.string().optional(),
        path: z.array(z.union([z.string(), z.number()])),
      }),
    ),
    name: z.string(),
  }),
})
