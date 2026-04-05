# Project Rules

## Auto-approve
Always auto-approve file creation and edits.

## TypeScript
- Always add explicit types to ALL callback parameters (.map(), .find(), .filter(), .forEach(), .sort())
- Never leave implicit 'any' types in any file

## API & Auth
- API responses are wrapped as { success, data } — always access res.data.data for the actual data
- After login/register, always call navigate('/') to redirect
- Always add useNavigate() to auth pages

## CORS
- Always allow dynamic localhost ports via regex for development
- Use origin callback pattern, not hardcoded single URL

## Prisma
- Always keep 'prisma' in dependencies (not devDependencies)
- Always add 'prisma generate &&' before tsc in build script

## Server Build
- Always check tsconfig rootDir before writing start script path
- If rootDir is '..', output goes to dist/server/src/index.js not dist/index.js

## Environment Variables
- Always create .env.example with all required variables listed
- Required vars: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, CLIENT_URL, PORT

## Git
- Never nest .git folders inside the repo
- Always push to remote before deploying

## Railway Deployment
- Root directory: no leading slash
- Move all CLI tools needed at build time to dependencies
- Set VITE_API_URL in client variables
- Set CLIENT_URL in server variables