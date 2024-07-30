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
  result?: unknown
  error?: unknown
}

export type RpcInterceptedResponse = Record<
  string,
  { result?: unknown; error?: unknown }
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
  const interceptedRequests: RpcInterceptedResponse = {}

  const server = setupServer(
    ...chainProviderUrls.map((url) =>
      http.post(url, async ({ request }) => {
        const response = await fetch(bypass(request))

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

        requests.forEach((request) => {
          const key = createKey(url, request)

          const { result, error } = responses.find(
            (response) => response.id === request.id,
          )!

          interceptedRequests[key] = { result, error }
        })

        return createResponse(responseArrayBuffer)
      }),
    ),
  )

  server.listen({ onUnhandledRequest: 'bypass' })
  return {
    interceptedRequests,
    stop: () => server.close(),
  }
}

export const startRpcMock = (
  // TODO When we use this for every test case, we can make this required and throw if an rpc request is not there
  interceptedRequests: RpcInterceptedResponse | undefined,
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

            const storedResponse = interceptedRequests?.[key]
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
