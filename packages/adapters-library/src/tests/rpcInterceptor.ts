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

export const startRpcMock = (
  // TODO When we use this for every test case, we can make this required and throw if an rpc request is not there
  interceptedResponses: RpcInterceptedResponses | undefined,
  chainProviderUrls: string[],
) => {
  const server = setupServer(
    ...chainProviderUrls.map((url) =>
      http.post(url, async ({ request }) => {
        const requestBody = (await request.clone().json()) as
          | RpcRequest
          | RpcRequest[]

        const requests = Array.isArray(requestBody)
          ? requestBody
          : [requestBody]

        try {
          const responses = requests.map((request) => {
            const key = createKey(url, request)

            const storedResponse = interceptedResponses?.[key]
            if (!storedResponse) {
              console.warn('RPC request not found in snapshot', {
                url: new URL(url).origin,
                key,
                request,
                params: request.params,
              })
              throw Error('RPC request not found in snapshot')
            }

            return {
              jsonrpc: '2.0',
              id: request.id,
              ...storedResponse,
            } as RpcResponse
          })

          // If there is only one request, do not return an array
          return createResponse(
            new TextEncoder().encode(
              JSON.stringify(responses.length > 1 ? responses : responses[0]),
            ).buffer,
          )
        } catch (error) {
          // If anything goes wrong, bypass the request
          return createResponse(
            await (await fetch(bypass(request))).arrayBuffer(),
          )
        }
      }),
    ),
  )

  server.listen({ onUnhandledRequest: 'bypass' })
  return {
    stop: () => server.close(),
  }
}
