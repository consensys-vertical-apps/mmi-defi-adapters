import { createHash } from 'node:crypto'
import { http, bypass } from 'msw'
import { setupServer } from 'msw/node'

type RpcRequest = {
  jsonrpc: string
  id: number
  method: string
  params: unknown[]
}

type RpcResponse = {
  jsonrpc: string
  id: number
  result?: string
  error?: unknown
}

export type RpcInterceptedResponses = Record<
  string,
  {
    result?: string
    error?: unknown
    request?: {
      method: string
      params: unknown[]
    }
    metrics?: {
      startTime: number
      endTime: number
      timeTaken: number
      estimatedGas: string | undefined
    }
  }
>

function createKey(url: string, { method, params }: RpcRequest) {
  return createHash('md5')
    .update(
      url +
        JSON.stringify({
          method,
          params,
        }),
    )
    .digest('hex')
}

function createResponse(body: ArrayBuffer) {
  return new Response(body, {
    status: 200,
    statusText: 'OK',
    headers: new Headers([
      ['content-length', body.byteLength.toString()],
      ['content-type', 'application/json'],
    ]),
  })
}

export const startRpcSnapshot = (chainProviderUrls: string[]) => {
  const interceptedResponses: RpcInterceptedResponses = {}

  const server = setupServer(
    ...chainProviderUrls.map((url) =>
      http.post(url, async ({ request }) => {
        const startTime = Date.now()
        const response = await fetch(bypass(request))
        const endTime = Date.now()

        if (response.status !== 200) {
          console.warn('RPC request failed')
          return response
        }

        const responseArrayBuffer = await response.arrayBuffer()

        const requestBody = (await request.clone().json()) as
          | RpcRequest
          | RpcRequest[]

        const responseBody = JSON.parse(
          new TextDecoder().decode(responseArrayBuffer),
        ) as RpcResponse | RpcResponse[]

        const requests = Array.isArray(requestBody)
          ? requestBody
          : [requestBody]

        const responses = Array.isArray(responseBody)
          ? responseBody
          : [responseBody]

        if (requests.length !== responses.length) {
          throw Error('Length mismatch in requests and responses')
        }

        for (const [i, request] of requests.entries()) {
          const key = createKey(url, request)

          const { result, error } = responses.find(
            (response) => response.id === request.id,
          )!

          interceptedResponses[key] = {
            result,
            error,
            request: { method: request.method, params: request.params },
          }

          let estimatedGas: string | undefined
          if (request.method === 'eth_call') {
            const estimatedGasResponse = (await fetch(
              bypass(
                new Request(url, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    ...request,
                    method: 'eth_estimateGas',
                  }),
                }),
              ),
            ).then((response) => response.json())) as RpcResponse

            if (estimatedGasResponse.result) {
              estimatedGas = BigInt(estimatedGasResponse.result).toString()
            }
          }

          interceptedResponses[key]!.metrics = {
            startTime,
            endTime,
            timeTaken: i === 0 ? endTime - startTime : 0,
            estimatedGas,
          }
        }

        return createResponse(responseArrayBuffer)
      }),
    ),
  )

  server.listen({ onUnhandledRequest: 'bypass' })
  return {
    interceptedResponses,
    stop: () => server.close(),
  }
}
