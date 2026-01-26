#!/bin/sh
set -e

# Write runtime env config for the SPA to consume. Values are expected to be set
# as container environment variables (e.g. via ECS task definition).
cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
  VITE_API_NEED: "${VITE_API_NEED:-}",
  VITE_API_RESOURCE: "${VITE_API_RESOURCE:-}",
  VITE_API_AUTH: "${VITE_API_AUTH:-}",
  VITE_GOOGLE_CLIENT_ID: "${VITE_GOOGLE_CLIENT_ID:-}"
};
EOF

exec "$@"
