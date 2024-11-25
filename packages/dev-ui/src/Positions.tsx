import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { DevTool } from '@hookform/devtools'
import type {
  Chain,
  DefiPositionResponse,
  Protocol,
} from '@metamask-institutional/defi-adapters'
import type {
  TokenType,
  Underlying,
} from '@metamask-institutional/defi-adapters/dist/types/adapter'
import type { DisplayPosition } from '@metamask-institutional/defi-adapters/dist/types/response'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import Select from 'react-select'
import { JsonDisplay } from './JsonDisplay'
import { ChainIdToChainNameMap } from './chainIdToChainNameMap'
import { provider } from './defiAdapterLibrary'
import { useFiltersContext } from './filtersContext'

type FormValues = {
  userAddress: string
  protocolIds: { value: string; label: string }[] | undefined
  chainIds: { value: number; label: string }[] | undefined
}

export function Positions() {
  const filtersContext = useFiltersContext()
  const queryClient = useQueryClient()
  const {
    handleSubmit,
    register,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      userAddress: filtersContext.userAddress,
      protocolIds: filtersContext.protocolIds,
      chainIds: filtersContext.chainIds,
    },
  })

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    filtersContext.setFilters({
      userAddress: data.userAddress,
      protocolIds: data.protocolIds?.length ? data.protocolIds : undefined,
      chainIds: data.chainIds?.length ? data.chainIds : undefined,
    })

    await queryClient.invalidateQueries({
      queryKey: [
        'positions',
        data.userAddress,
        data.protocolIds?.length
          ? data.protocolIds.map((v) => v.value).join(',')
          : null,
        data.chainIds?.length
          ? data.chainIds.map((v) => v.value).join(',')
          : null,
      ],
    })
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen gap-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="p-6 bg-white rounded shadow-md w-[50%] flex flex-col gap-4"
      >
        <Input
          type="text"
          {...register('userAddress', {
            required: {
              value: true,
              message: 'User Address is required',
            },
            pattern: {
              value: /^0x[a-fA-F0-9]{40}$/,
              message: 'Invalid Ethereum Address',
            },
          })}
          placeholder="User Address"
          className="border border-gray-300 rounded"
        />
        {errors.userAddress && <p>{errors.userAddress.message}</p>}

        <Controller
          control={control}
          name="protocolIds"
          render={({ field }) => (
            <Select
              {...field}
              options={filtersContext.protocolOptions}
              isMulti={true}
              placeholder="Protocol Filter"
            />
          )}
        />

        <Controller
          control={control}
          name="chainIds"
          render={({ field }) => (
            <Select
              {...field}
              options={filtersContext.chainOptions}
              isMulti={true}
              placeholder="Chain Filter"
            />
          )}
        />

        <Button
          type="submit"
          className="text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Search
        </Button>
      </form>

      <PositionsDisplay
        userAddress={filtersContext.userAddress}
        protocolIds={filtersContext.protocolIds?.map(
          (selection) => selection.value,
        )}
        chainIds={filtersContext.chainIds?.map((selection) => selection.value)}
      />
      <DevTool control={control} />
    </div>
  )
}

function PositionsDisplay({
  userAddress,
  protocolIds,
  chainIds,
}: {
  userAddress: string
  protocolIds: string[] | undefined
  chainIds: number[] | undefined
}) {
  const { isPending, error, data, isFetching, isRefetching } = useQuery({
    queryKey: [
      'positions',
      userAddress,
      protocolIds?.length ? protocolIds.join(',') : null,
      chainIds?.length ? chainIds.join(',') : null,
    ],
    queryFn: () =>
      provider.getPositions({
        userAddress,
        filterProtocolIds: protocolIds as Protocol[] | undefined,
        filterChainIds: chainIds as Chain[] | undefined,
      }),
    enabled: userAddress.length > 0,
  })

  if (userAddress.length === 0) return null

  if (isPending || isFetching || isRefetching) return 'Loading...'

  if (error) return `An error has occurred: ${error.message}`

  if (data.length === 0) return 'No positions found'

  const successfulPositions = data.filter(
    (position): position is DefiPositionResponse & { success: true } =>
      position.success,
  )

  const groupedPositions = successfulPositions.reduce(
    (acc, position) => {
      const key = `${position.protocolId}#${position.chainId}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(position)
      return acc
    },
    {} as Record<string, (DefiPositionResponse & { success: true })[]>,
  )

  return (
    <Tabs defaultValue="display" className="w-full">
      <TabsList>
        <TabsTrigger value="display">Display</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
      </TabsList>
      <TabsContent value="display">
        {Object.entries(groupedPositions).map(
          ([protocolChainKey, positions]) => {
            const { protocolId, chainId, iconUrl } = positions[0]
            return (
              <Card key={protocolChainKey}>
                <CardHeader>
                  <CardTitle>
                    <div className="flex gap-2 items-center">
                      <img className="w-10 h-10" src={iconUrl} alt="Icon" />
                      {protocolId}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {ChainIdToChainNameMap[chainId]}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {positions.map((position, index) => {
                    return (
                      <div
                        key={index}
                        className="mb-4 p-4 border border-gray-300"
                      >
                        <h3>{position.name}</h3>
                        {position.tokens.map((token, index) => {
                          const underlyings = resolveUnderlyings(token.tokens)
                          return (
                            <div
                              key={index}
                              className="mb-2 p-2 border border-gray-300"
                            >
                              <div className="flex justify-between items-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <h4>
                                        {token.name} | {token.symbol}
                                      </h4>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {formatTokenBalance(token.balance)}{' '}
                                        tokens
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <div className="flex gap-2 items-center">
                                  {underlyings.some(
                                    (token) => token.total === undefined,
                                  ) && (
                                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                                  )}
                                  {formatCurrency(
                                    underlyings.reduce(
                                      (acc, curr) => acc + (curr.total || 0),
                                      0,
                                    ),
                                  )}
                                </div>
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[200px]">
                                      Token
                                    </TableHead>
                                    <TableHead>Balance</TableHead>
                                    <TableHead className="text-right">
                                      Market Value
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {underlyings.map((token, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <div className="flex gap-2 items-center">
                                          <img
                                            className="w-5 h-5"
                                            src={token.iconUrl}
                                            alt="Icon"
                                          />
                                          <span>{token.symbol}</span>
                                          {token.type ===
                                            'underlying-claimable' &&
                                            '(reward)'}
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {formatTokenBalance(token.balance)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {token.total
                                          ? formatCurrency(token.total)
                                          : 'NO PRICE'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          },
        )}
      </TabsContent>
      <TabsContent value="json">
        <JsonDisplay data={data} />
      </TabsContent>
    </Tabs>
  )
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  })
}

function formatTokenBalance(amount: number) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 18,
  })
}

function resolveUnderlyings(
  tokens: DisplayPosition<Underlying>[] | undefined,
): {
  name: string
  symbol: string
  iconUrl: string
  balance: number
  price: number
  total: number | undefined
  type: TokenType
}[] {
  const result: {
    name: string
    symbol: string
    iconUrl: string
    balance: number
    price: number
    total: number | undefined
    type: TokenType
  }[] = []

  if (!tokens) {
    return result
  }

  for (const token of tokens) {
    if (token.tokens && token.tokens.length > 0) {
      result.push(...resolveUnderlyings(token.tokens))
    } else {
      result.push({
        balance: token.balance,
        name: token.name,
        symbol: token.symbol,
        iconUrl: token.iconUrl,
        price: token.price,
        total: token.price && token.balance * token.price,
        type: token.type,
      })
    }
  }

  return result
}
