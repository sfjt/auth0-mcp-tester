import { FastMCP } from "fastmcp"
import { z } from "zod"

import { authenticate } from "./auth0.js"
import { text } from "stream/consumers"

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN as string
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE as string
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
      scopesSupported: ["openid", "profile", "email", ...SCOPES]
    },

  }

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
  "name": "sessioninfo",
  description: "Returns the current session info",
  execute: async(_, context) => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify(context)
      }]
    }
  }
})

server.start({
  transportType: "httpStream",
  httpStream: {
    port: parseInt(process.env.PORT ?? "3001"),
  },
})
