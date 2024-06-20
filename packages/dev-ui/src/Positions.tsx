import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import {
  ChainName,
  DefiPositionResponse,
  Protocol,
} from '@metamask-institutional/defi-adapters'
import { Underlying } from '@metamask-institutional/defi-adapters/dist/types/adapter'
import { DisplayPosition } from '@metamask-institutional/defi-adapters/dist/types/response'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import Select from 'react-select'
import { provider } from './defiProvider'

type FormValues = {
  userAddress: string
  protocolIds: { value: string; label: string }[]
}

export function Positions() {
  const queryClient = useQueryClient()
  const {
    handleSubmit,
    register,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>()
  const [userAddress, setUserAddress] = useState('')
  const [protocolIds, setProtocolIds] = useState<string[]>([])

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    console.log('AAAAAAAAA', data)
    setUserAddress(data.userAddress)
    setProtocolIds(data.protocolIds.map((protocol) => protocol.value))
    await queryClient.invalidateQueries({
      queryKey: ['positions', userAddress],
    })
  }

  const protocolOptions = Object.entries(Protocol).map(([label, value]) => ({
    value,
    label,
  }))

  return (
    <div className="flex flex-col items-center justify-start min-h-screen gap-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="p-6 bg-white rounded shadow-md w-[50%] flex flex-col gap-4"
      >
        <Input
          type="text"
          {...register('userAddress')}
          placeholder="User Address"
          className="border border-gray-300 rounded"
          required
        />

        <Controller
          control={control}
          name="protocolIds"
          render={({ field: { onChange, onBlur, value, name, ref } }) => (
            <Select
              placeholder="Protocol Filter"            
              options={protocolOptions}
              onChange={onChange}
              isMulti={true}
              onBlur={onBlur}
              value={value}
              name={name}
              ref={ref}
            />
          )}
        />

        <Button
          type="submit"
          className="p-2 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Search
        </Button>
      </form>
      <PositionsDisplay userAddress={userAddress} protocolIds={protocolIds} />
    </div>
  )
}

function PositionsDisplay({
  userAddress,
  protocolIds,
}: { userAddress: string; protocolIds: string[] }) {
  const { isPending, error, data, isFetching, isRefetching } = useQuery({
    queryKey: ['positions', userAddress],
    queryFn: () =>
      provider.getPositions({
        userAddress,
        filterProtocolIds: protocolIds as Protocol[],
      }),
    enabled: userAddress.length > 0,
  })

  if (userAddress.length === 0) return null

  if (isPending || isFetching || isRefetching) return 'Loading...'

  if (error) return `An error has occurred: ${error.message}`

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
    <div className="w-full">
      {Object.entries(groupedPositions).map(([protocolChainKey, positions]) => {
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
              <CardDescription>{ChainName[chainId]}</CardDescription>
            </CardHeader>
            <CardContent>
              {positions.map((position, index) => {
                return (
                  <div key={index} className="mb-4 p-4 border border-gray-300">
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
                                  <h4>{token.name}</h4>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {formatTokenBalance(token.balance)} tokens
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
                                <TableHead className="w-[100px]">
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
      })}
      {/* <JsonDisplay data={data} /> */}
    </div>
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
    maximumFractionDigits: 4,
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
}[] {
  const result: {
    name: string
    symbol: string
    iconUrl: string
    balance: number
    price: number
    total: number | undefined
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
      })
    }
  }

  return result
}
