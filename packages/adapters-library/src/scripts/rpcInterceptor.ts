import { createHash } from 'node:crypto'
import { http, bypass } from 'msw'
import { setupServer } from 'msw/node'
import { Json } from '../types/json'

type RpcRequest = {
  method: string
  params: Json[]
  id: number
}

function createKey(url: string, requestBody: Json) {
  return createHash('md5')
    .update(url + JSON.stringify(requestBody))
    .digest('hex')
}

function slimRequest({ method, params }: RpcRequest) {
  return {
    method,
    params,
  }
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
  const interceptedRequests: Record<
    string,
    {
      request: Omit<RpcRequest, 'id'>
      response: string
    }
  > = {}

  const server = setupServer(
    ...chainProviderUrls.map((url) =>
      http.post(url, async ({ request }) => {
        const response = await fetch(bypass(request))

        if (response.status !== 200) {
          console.warn('RPC request failed')
          return response
        }

        const requestBody = (await request.clone().json()) as RpcRequest
        const slimRequestBody = slimRequest(requestBody)

        const key = createKey(url, slimRequestBody)

        const body = await response.arrayBuffer()

        interceptedRequests[key] = {
          request: slimRequestBody,
          response: JSON.parse(new TextDecoder().decode(body)).result,
        }

        return createResponse(body)
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
  interceptedRequests:
    | Record<
        string,
        {
          request: Omit<RpcRequest, 'id'>
          response: string
        }
      >
    | undefined,
  chainProviderUrls: string[],
) => {
  const server = setupServer(
    ...chainProviderUrls.map((url) =>
      http.post(url, async ({ request }) => {
        const requestBody = await request.clone().json()
        const slimRequestBody = slimRequest(requestBody)

        const key = createKey(url, slimRequestBody)

        const storedResponse = interceptedRequests?.[key]
        if (!storedResponse) {
          console.warn('A request is not being mocked')
          return await fetch(bypass(request))
        }

        const responseBody = new TextEncoder().encode(
          JSON.stringify({
            result: storedResponse.response,
            id: requestBody.id,
            jsonrpc: '2.0',
          }),
        ).buffer

        return createResponse(responseBody)
      }),
    ),
  )

  server.listen({ onUnhandledRequest: 'bypass' })
  return {
    stop: () => server.close(),
  }
}
