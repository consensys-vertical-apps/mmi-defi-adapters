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
import { DevTool } from '@hookform/devtools'
import type {
  Chain,
  Protocol,
  TimePeriod,
} from '@metamask-institutional/defi-adapters'
import type { DefiProfitsResponse } from '@metamask-institutional/defi-adapters/dist/types/response'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import Select from 'react-select'
import { JsonDisplay } from './JsonDisplay'
import { ChainIdToChainNameMap } from './chainIdToChainNameMap'
import { provider } from './defiAdapterLibrary'
import { useFiltersContext } from './filtersContext'

export const timePeriodOptions = [
  { value: 1, label: '1 Day' },
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
] as const

type FormValues = {
  userAddress: string
  timePeriod: { value: TimePeriod; label: string }
  protocolIds: { value: string; label: string }[] | undefined
  chainIds: { value: number; label: string }[] | undefined
}

export function Profits() {
  const filtersContext = useFiltersContext()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({
    defaultValues: {
      userAddress: filtersContext.userAddress,
      timePeriod: localStorage.getItem('defi-adapters:timePeriod')?.length
        ? localStorage
            .getItem('defi-adapters:timePeriod')!
            .split(':')
            .reduce(
              (acc, value, index) => {
                if (index === 0) {
                  acc.value = Number(value) as TimePeriod
                } else {
                  acc.label = value
                }
                return acc
              },
              {} as {
                value: TimePeriod
                label: string
              },
            )
        : timePeriodOptions[0],
      protocolIds: filtersContext.protocolIds,
      chainIds: filtersContext.chainIds,
    },
  })

  const [timePeriod, setTimePeriod] = useState<{
    value: TimePeriod
    label: string
  }>(getValues('timePeriod'))

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    filtersContext.setFilters({
      userAddress: data.userAddress,
      protocolIds: data.protocolIds?.length ? data.protocolIds : undefined,
      chainIds: data.chainIds?.length ? data.chainIds : undefined,
    })

    setTimePeriod(data.timePeriod)
    localStorage.setItem(
      'defi-adapters:timePeriod',
      `${data.timePeriod.value}:${data.timePeriod.label}`,
    )

    await queryClient.invalidateQueries({
      queryKey: [
        'profits',
        data.userAddress,
        data.timePeriod,
        data.protocolIds?.length ? data.protocolIds.join(',') : null,
        data.chainIds?.length ? data.chainIds.join(',') : null,
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
          name="timePeriod"
          render={({ field }) => (
            <Select
              {...field}
              placeholder="Chain Filter"
              options={timePeriodOptions}
            />
          )}
        />

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

      <ProfitsDisplay
        userAddress={filtersContext.userAddress}
        timePeriod={timePeriod.value}
        protocolIds={filtersContext.protocolIds?.map(
          (selection) => selection.value,
        )}
        chainIds={filtersContext.chainIds?.map((selection) => selection.value)}
      />
      <DevTool control={control} />
    </div>
  )
}

function ProfitsDisplay({
  userAddress,
  timePeriod,
  protocolIds,
  chainIds,
}: {
  userAddress: string
  timePeriod: TimePeriod
  protocolIds: string[] | undefined
  chainIds: number[] | undefined
}) {
  const { isPending, error, data, isFetching, isRefetching } = useQuery({
    queryKey: [
      'profits',
      userAddress,
      timePeriod,
      protocolIds?.join(','),
      chainIds?.join(','),
    ],
    queryFn: () =>
      provider.getProfits({
        userAddress,
        timePeriod,
        filterProtocolIds: protocolIds as Protocol[] | undefined,
        filterChainIds: chainIds as Chain[] | undefined,
      }),
    enabled: userAddress.length > 0,
  })

  if (userAddress.length === 0) return null

  if (isPending || isFetching || isRefetching) return 'Loading...'

  if (error) return `An error has occurred: ${error.message}`

  if (data.length === 0) return 'No positions found'

  const successfulResults = data.filter(
    (adapterResult): adapterResult is DefiProfitsResponse & { success: true } =>
      adapterResult.success,
  )

  const groupedResults = successfulResults.reduce(
    (acc, adapterResult) => {
      const key = `${adapterResult.protocolId}#${adapterResult.chainId}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(adapterResult)
      return acc
    },
    {} as Record<string, (DefiProfitsResponse & { success: true })[]>,
  )

  return (
    <Tabs defaultValue="display" className="w-full">
      <TabsList>
        <TabsTrigger value="display">Display</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
      </TabsList>
      <TabsContent value="display">
        {Object.entries(groupedResults).map(
          ([protocolChainKey, protocolProfits]) => {
            const { protocolId, chainId, iconUrl } = protocolProfits[0]
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
                  {protocolProfits.map((profits, index) => {
                    return (
                      <div
                        key={index}
                        className="mb-4 p-4 border border-gray-300"
                      >
                        <h3>{profits.name}</h3>
                        {profits.tokens.map((token, index) => {
                          return (
                            <div
                              key={index}
                              className="mb-2 p-2 border border-gray-300"
                            >
                              <h4>{token.name}</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Profit</TableHead>
                                    <TableHead>Performance</TableHead>
                                    <TableHead>Start Position</TableHead>
                                    <TableHead>End Position</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow>
                                    <TableCell>
                                      {formatCurrency(token.profit)}
                                    </TableCell>
                                    <TableCell>
                                      {formatDecimal(token.performance)}
                                    </TableCell>
                                    <TableCell>
                                      {formatCurrency(
                                        token.calculationData
                                          .startPositionValue,
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {formatCurrency(
                                        token.calculationData.endPositionValue,
                                      )}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Deposits</TableHead>
                                    <TableHead>Withdrawals</TableHead>
                                    <TableHead>Borrows</TableHead>
                                    <TableHead>Repays</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow>
                                    <TableCell>
                                      {formatCurrency(
                                        token.calculationData.deposits,
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {formatCurrency(
                                        token.calculationData.withdrawals,
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {formatCurrency(
                                        token.calculationData.borrows,
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {formatCurrency(
                                        token.calculationData.repays,
                                      )}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                              {token.calculationData
                                .hasTokensWithoutUSDPrices && (
                                <>
                                  <h5>Tokens with no prices</h5>
                                  <ul>
                                    {token.calculationData.tokensWithoutUSDPrices?.map(
                                      (token, index) => (
                                        <li key={index}>
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger>
                                                {token.name} - Balance:{' '}
                                                {formatDecimal(
                                                  Number(
                                                    token.balanceRaw.toString(),
                                                  ),
                                                )}
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>{token.address}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </>
                              )}
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

function formatDecimal(amount: number) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })
}
