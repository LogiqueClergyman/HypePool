#!/bin/bash
# Deploy prediction market contracts to Stellar Mainnet
# Run from: soroban-hello-world/stellar/
#
# Deployment order matters:
#   1. Prompt for existing oracle secret key
#   2. Ensure oracle/deployer account is funded on mainnet
#   3. Upload prediction-market WASM → get wasm hash
#   4. Deploy market-factory → get factory address
#   5. Initialize factory with (admin, wasm_hash)
#   6. Wrap native XLM SAC → get token address
#
# Output: all addresses/hashes printed and saved to .env.mainnet.deploy

set -euo pipefail

NETWORK="mainnet"
RPC_URL="https://mainnet.sorobanrpc.com"
NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
IDENTITY="oracle-deployer"
TMP_CONFIG_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_CONFIG_DIR"
}
trap cleanup EXIT

echo "═══════════════════════════════════════════════════"
echo "  Stellar Prediction Market — Contract Deployment"
echo "═══════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────
# Step 1: Prompt for existing oracle secret key
# ─────────────────────────────────────────────────────
echo "🔐 Enter existing oracle/deployer secret key (starts with S)"
read -rsp "ORACLE_SECRET_KEY: " ORACLE_SECRET
echo ""

if [[ -z "${ORACLE_SECRET}" ]]; then
  echo "❌ ORACLE_SECRET_KEY cannot be empty"
  exit 1
fi

# Import key into an ephemeral Stellar CLI config dir (deleted on exit).
# Nothing is persisted to your normal CLI identity storage.
printf '%s\n' "$ORACLE_SECRET" | stellar --config-dir "$TMP_CONFIG_DIR" keys add "$IDENTITY" --secret-key --overwrite > /dev/null

ADMIN_ADDRESS=$(stellar --config-dir "$TMP_CONFIG_DIR" keys public-key "$IDENTITY")
echo "   Address: $ADMIN_ADDRESS"

# Mainnet accounts must be funded manually (friendbot is testnet-only)
echo "💰 Mainnet funding check"
echo "   Make sure '$ADMIN_ADDRESS' is funded with enough XLM for fees."
echo "   Friendbot is NOT available on mainnet."
echo ""

# ─────────────────────────────────────────────────────
# Step 2: Build contracts (ensure up to date)
# ─────────────────────────────────────────────────────
echo "🔨 Building contracts..."
stellar contract build
echo "✅ Contracts built"
echo ""

# ─────────────────────────────────────────────────────
# Step 3: Upload prediction-market WASM → get hash
# ─────────────────────────────────────────────────────
echo "📤 Uploading prediction-market WASM..."
PM_WASM_HASH=$(stellar contract upload \
  --wasm target/wasm32v1-none/release/prediction_market.wasm \
  --source "$IDENTITY" \
  --config-dir "$TMP_CONFIG_DIR" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

echo "✅ Prediction Market WASM Hash: $PM_WASM_HASH"
echo ""

# ─────────────────────────────────────────────────────
# Step 4: Deploy market-factory contract
# ─────────────────────────────────────────────────────
echo "🚀 Deploying market-factory contract..."
FACTORY_ADDRESS=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/market_factory.wasm \
  --source "$IDENTITY" \
  --config-dir "$TMP_CONFIG_DIR" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

echo "✅ Factory Contract Address: $FACTORY_ADDRESS"
echo ""

# ─────────────────────────────────────────────────────
# Step 5: Initialize the factory
# ─────────────────────────────────────────────────────
echo "⚙️  Initializing factory..."
stellar contract invoke \
  --id "$FACTORY_ADDRESS" \
  --source "$IDENTITY" \
  --config-dir "$TMP_CONFIG_DIR" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- \
  init \
  --admin "$ADMIN_ADDRESS" \
  --market_wasm_hash "$PM_WASM_HASH"

echo "✅ Factory initialized with admin + prediction-market WASM"
echo ""

# ─────────────────────────────────────────────────────
# Step 6: Get the native XLM SAC (Stellar Asset Contract) address
# ─────────────────────────────────────────────────────
echo "🪙  Resolving native XLM SAC address..."
TOKEN_ADDRESS=$(stellar contract id asset \
  --asset native \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

echo "✅ Native XLM SAC Address: $TOKEN_ADDRESS"
echo ""

# ─────────────────────────────────────────────────────
# Step 7: Export the oracle key for .env
# ─────────────────────────────────────────────────────
# Reuse the prompted key directly.

# ─────────────────────────────────────────────────────
# Output summary
# ─────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════"
echo "  DEPLOYMENT COMPLETE — Copy these to your .env"
echo "═══════════════════════════════════════════════════"
echo ""
echo "STELLAR_NETWORK=mainnet"
echo "STELLAR_RPC_URL=$RPC_URL"
echo "STELLAR_HORIZON_URL=https://horizon.stellar.org"
echo "STELLAR_NETWORK_PASSPHRASE=$NETWORK_PASSPHRASE"
echo "FACTORY_CONTRACT_ADDRESS=$FACTORY_ADDRESS"
echo "TOKEN_CONTRACT_ADDRESS=$TOKEN_ADDRESS"
echo "ORACLE_SECRET_KEY=$ORACLE_SECRET"
echo "ORACLE_PUBLIC_KEY=$ADMIN_ADDRESS"
echo ""

# Save to file for easy sourcing
cat > .env.mainnet.deploy <<EOF
# Generated by deploy_mainnet.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
STELLAR_NETWORK=mainnet
STELLAR_RPC_URL=$RPC_URL
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_NETWORK_PASSPHRASE=$NETWORK_PASSPHRASE
FACTORY_CONTRACT_ADDRESS=$FACTORY_ADDRESS
TOKEN_CONTRACT_ADDRESS=$TOKEN_ADDRESS
ORACLE_SECRET_KEY=$ORACLE_SECRET
ORACLE_PUBLIC_KEY=$ADMIN_ADDRESS
PM_WASM_HASH=$PM_WASM_HASH
EOF

echo "📁 Saved to stellar/.env.mainnet.deploy"
echo ""
echo "Next steps:"
echo "  1. Copy the values above into your root .env file"
echo "  2. Start the backend: npm run dev"
echo "  3. Run the test script: npx ts-node src/scripts/testAPI.ts"

# Best-effort cleanup for in-memory shell variable after use.
unset ORACLE_SECRET
