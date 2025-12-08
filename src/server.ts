import { FastMCP } from "fastmcp"
import { z } from "zod"

import { authenticate, customTokenExchange } from "./auth0.js"

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN as string
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE as string
const SCOPES = ["test:mcp"]

async function getAccessTokenForUpstreamAPI(subjectToken: string) {
  if (!subjectToken) return { token: null, scope: null }

  try {
    const result = await customTokenExchange(subjectToken)
    return {
      token: result.accessToken,
      scope: result.scope,
    }
  } catch (error) {
    console.error("Error during token exchange:", error)
    throw error
  }
}

const server = new FastMCP({
  name: "auth0-mcp-tester",
  version: "0.1.0",
  authenticate,
  oauth: {
    enabled: true,
    protectedResource: {
      resource: AUTH0_AUDIENCE,
      authorizationServers: [`https://${AUTH0_DOMAIN}/`],
      jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
      scopesSupported: ["openid", "profile", "email", ...SCOPES],
    },
  },
})

server.addTool({
  name: "add",
  description: "Add two numbers (Requires test:mcp scope)",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  canAccess: (auth) => {
    return auth.scopes.includes("test:mcp")
  },
  execute: async (args) => {
    return String(args.a + args.b)
  },
})

server.addTool({
  name: "session-info",
  description: "Returns current session info",
  execute: async (_, context) => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(context),
        },
      ],
    }
  },
})

server.addTool({
  name: "test-custom-token-exchange",
  description: "Test Custom Token Exchange",
  execute: async (_, context) => {
    const subjectToken = context.session!.token
    const { token } = await getAccessTokenForUpstreamAPI(subjectToken)
    return {
      content: [
        {
          type: "text",
          text: token || "",
        },
      ],
    }
  }
})

server.start({
  transportType: "httpStream",
  httpStream: {
    port: parseInt(process.env.PORT ?? "3001"),
  },
})
