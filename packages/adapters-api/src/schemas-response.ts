import {
  Chain,
  PositionType,
  Protocol,
  TokenType,
} from '@metamask-private/defi-adapters'
import { z } from 'zod'

// All these schemas are generated for the OpenAPI spec, not for validation

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
