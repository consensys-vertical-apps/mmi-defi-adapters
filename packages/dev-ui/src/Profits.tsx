import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SubmitHandler, useForm } from 'react-hook-form'
import { provider } from './defiProvider'
import { ChainName, TimePeriod } from '@metamask-institutional/defi-adapters'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { DefiProfitsResponse } from '@metamask-institutional/defi-adapters/dist/types/response'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { JsonDisplay } from './JsonDisplay'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function Profits() {
  const queryClient = useQueryClient()
  const { register, handleSubmit } = useForm<{
    userAddress: string
    timePeriod: TimePeriod
  }>()
  const [userAddress, setUserAddress] = useState('')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(TimePeriod.oneDay)

  const onSubmit: SubmitHandler<{
    userAddress: string
    timePeriod: TimePeriod
  }> = async (data) => {
    setUserAddress(data.userAddress)
    setTimePeriod(data.timePeriod)
    await queryClient.invalidateQueries({
      queryKey: ['profits', userAddress],
    })
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen gap-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="p-6 bg-white rounded shadow-md w-[50%]"
      >
        <Input
          type="text"
          {...register('userAddress')}
          placeholder="User Address"
          className="p-2 mb-4 border border-gray-300 rounded"
        />
        <Input
          type="number"
          {...register('timePeriod')}
          placeholder="Time Period (1, 7 or 30)"
          className="p-2 mb-4 border border-gray-300 rounded max-w-[200px]"
        />
        <Button
          type="submit"
          className="p-2 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Search
        </Button>
      </form>
      <ProfitsDisplay userAddress={userAddress} timePeriod={timePeriod} />
    </div>
  )
}

function ProfitsDisplay({
  userAddress,
  timePeriod,
}: {
  userAddress: string
  timePeriod: TimePeriod
}) {
  const { isPending, error, data, isFetching, isRefetching } = useQuery({
    queryKey: ['profits'],
    queryFn: () => provider.getProfits({ userAddress, timePeriod }),
    enabled: userAddress.length > 0,
  })

  if (userAddress.length === 0) return null

  if (isPending || isFetching || isRefetching) return 'Loading...'

  if (error) return 'An error has occurred: ' + error.message

  const successfulResults = data.filter(
    (adapterResult): adapterResult is DefiProfitsResponse & { success: true } =>
      adapterResult.success,
  )

  const groupedResults = successfulResults.reduce(
    (acc, adapterResult) => {
      const key = adapterResult.protocolId + '#' + adapterResult.chainId
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(adapterResult)
      return acc
    },
    {} as Record<string, (DefiProfitsResponse & { success: true })[]>,
  )

  return (
    <div className="w-full">
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
                <CardDescription>{ChainName[chainId]}</CardDescription>
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
                                      token.calculationData.startPositionValue,
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
      <JsonDisplay data={data} />
    </div>
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
