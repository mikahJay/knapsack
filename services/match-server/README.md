# Match Server

The match-server service handles matching public needs with public resources and vice versa.

## Overview

- **Real-time matching**: When a user submits a need or resource from the web-app, matching begins and returns results.
- **Background cadence**: Periodically runs for all unfulfilled or unmatched resources and needs.
- **Dummy data (MVP)**: Currently returns hard-coded arrays of resources or needs.

## Development

### Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Claude API key to `.env`:
   ```
   CLAUDE_API_KEY=your_actual_api_key_here
   ```

3. Install and start:
   ```bash
   npm install
   npm start
   ```

## API

- `GET /health` - Health check endpoint
- `POST /match/needs` - Match a need against available resources (returns dummy data)
- `POST /match/resources` - Match a resource against available needs (returns dummy data)

## Deployment

Deployed as an ECS Fargate service accessible via the ALB at `/match/*` routes.
