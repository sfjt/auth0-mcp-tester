import { FastMCP } from "fastmcp"
import { z } from "zod"

import { authenticate } from "./auth0.js"

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN as string
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE as string
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID as string
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET as string
const SCOPES = ["test:mcp"]

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
  description: "Add two numbers",
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
  name: "github-profile",
  description: "Gets Google profile: Requires Google Social connection and Token Vault enabled",
  execute: async (_, context) => {
    const subjectToken = context.session?.token || ""
    const params = new URLSearchParams()
    params.append("client_id", AUTH0_CLIENT_ID)
    params.append("client_secret", AUTH0_CLIENT_SECRET)
    params.append("subject_token", subjectToken)
    params.append("grant_type", "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token")
    params.append("subject_token_type", "urn:ietf:params:oauth:token-type:access_token")
    params.append("requested_token_type","http://auth0.com/oauth/token-type/federated-connection-access-token")
    params.append("connection", "google-oauth2")
    const response = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      }
    )
    console.log(await response.json())
  }
})

server.start({
  transportType: "httpStream",
  httpStream: {
    port: parseInt(process.env.PORT ?? "3001"),
  },
})
