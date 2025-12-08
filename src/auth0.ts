import type { IncomingMessage } from "http"
import { ApiClient, getToken, VerifyAccessTokenError, InvalidRequestError } from "@auth0/auth0-api-js"
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import { InsufficientScopeError, InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js"
import { getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/sdk/server/auth/router.js"

const PORT = parseInt(process.env.PORT ?? "3001")
const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? `http://localhost${PORT}`
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN as string
const MCP_SERVER_AUDIENCE = process.env.MCP_SERVER_AUDIENCE as string
const MCP_SERVER_CLIENT_ID = process.env.MCP_SERVER_CLIENT_ID as string
const MCP_SERVER_CLIENT_SECRET = process.env.MCP_SERVER_CLIENT_SECRET as string

const TOKEN_EXCHANGE_AUDIENCE = process.env.TOKEN_EXCHANGE_AUDIENCE as string

export type FastMCPAuthSession = AuthInfo & { [key: string]: unknown }

const apiClient = new ApiClient({
  domain: AUTH0_DOMAIN,
  audience: MCP_SERVER_AUDIENCE,
  clientId: MCP_SERVER_CLIENT_ID,
  clientSecret: MCP_SERVER_CLIENT_SECRET,
})

export async function customTokenExchange(subjectToken: string) {
  return await apiClient.getTokenByExchangeProfile(subjectToken, {
    subjectTokenType: "urn:fastmcp:mcp",
    audience: TOKEN_EXCHANGE_AUDIENCE,
    scope: "openid offline_access test:exchange",
  })
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

export async function authenticate(req: IncomingMessage) {
  try {
    const accessToken = getToken(req.headers)
    const verified = await apiClient.verifyAccessToken({
      accessToken,
    })

    if (!isNonEmptyString(verified.sub)) {
      throw new InvalidTokenError("Token is missing required claim: sub")
    }

    let clientId: string | undefined
    if (isNonEmptyString(verified.client_id)) {
      clientId = verified.client_id
    } else if (isNonEmptyString(verified.azp)) {
      clientId = verified.azp
    }

    if (!clientId) {
      throw new InvalidTokenError("Token is missing required client identification: client_id or azp")
    }

    const token = {
      token: accessToken,
      clientId,
      scopes: isNonEmptyString(verified.scope) ? verified.scope.split(" ").filter(Boolean) : [],
      ...(verified.exp && { expiresAt: verified.exp }),
      extra: {
        sub: verified.sub,
        ...(isNonEmptyString(verified.client_id) && { client_id: verified.client_id }),
        ...(isNonEmptyString(verified.azp) && { azp: verified.azp }),
      },
    } satisfies FastMCPAuthSession

    return token
  } catch (error) {
    if (
      error instanceof InvalidRequestError ||
      error instanceof VerifyAccessTokenError ||
      error instanceof InvalidTokenError
    ) {
      const msg = `Bearer error="invalid_token", error_description=${error.message}, resource_metadata=${getOAuthProtectedResourceMetadataUrl(new URL(MCP_SERVER_URL))}`
      console.log(msg)
      throw new Response(null, {
        status: 401,
        statusText: "Unauthorized",
        headers: {
          "WWW-Authenticate": msg,
        },
      })
    } else if (error instanceof InsufficientScopeError) {
      throw new Response(null, {
        status: 403,
        statusText: "Forbidden",
      })
    } else {
      throw new Response(null, {
        status: 500,
        statusText: "Internal Server Error",
      })
    }
  }
}
