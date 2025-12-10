# Auth0 MCP Tester

A testing application for Auth for MCP

## Prerequisites

- Have an [Auth0](https://auth0.com/ai) tenant.
- Settings > Advanced > enable `Resource Parameter Compatibility Profile`.
- Create an API for an MCP server.
  - Identifier: `https://mcp.test/`.
  - Permissions: Create a new permission `test:mcp`.
- Create a testing user and give them the `test:mcp` permission.
- [Create an Application for the MCP server](https://auth0.com/ai/docs/mcp/get-started/call-your-apis-on-users-behalf#create-an-application-for-your-mcp-server).
- Create an API for Token Exchange testing.
  - Identifier: `https://exchange.test/`
- Create a testing [Custom Token Exchange Action](https://auth0.com/ai/docs/mcp/get-started/call-your-apis-on-users-behalf#use-custom-token-exchange-action).
- Set up a [Token Exchange Profile](https://auth0.com/ai/docs/mcp/get-started/call-your-apis-on-users-behalf#set-up-the-token-exchange-profile).
- Rename `.env.example` to `.env` and fill in the required values.
