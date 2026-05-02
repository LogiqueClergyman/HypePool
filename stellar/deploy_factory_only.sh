#!/bin/bash
# Deploy ONLY the market-factory on Stellar Mainnet (skip prediction-market WASM upload).
# Run from: stellar/
#
# Usage:
#   ./deploy_factory_only.sh <PM_WASM_HASH>
#   PM_WASM_HASH=<hex> ./deploy_factory_only.sh

set -euo pipefail

RPC_URL="https://mainnet.sorobanrpc.com"
NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
IDENTITY="oracle-deployer"
TMP_CONFIG_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_CONFIG_DIR"
}
trap cleanup EXIT

PM_WASM_HASH="${PM_WASM_HASH:-${1:-}}"

if [[ -z "$PM_WASM_HASH" ]]; then
  echo "❌ Missing PM WASM hash. Example: ./deploy_factory_only.sh 6bb812ad7afd52c363fafdc05fb7d4c996051113037261341702e9e737e29b4d"
  exit 1
fi

echo "═══════════════════════════════════════════════════"
echo "  Market factory only — Mainnet | PM_WASM_HASH=$PM_WASM_HASH"
echo "═══════════════════════════════════════════════════"
echo ""
echo "🔐 Enter oracle/deployer secret key (starts with S)"
read -rsp "ORACLE_SECRET_KEY: " ORACLE_SECRET
echo ""

if [[ -z "${ORACLE_SECRET}" ]]; then
  echo "❌ ORACLE_SECRET_KEY cannot be empty"
  exit 1
fi

printf '%s\n' "$ORACLE_SECRET" | stellar --config-dir "$TMP_CONFIG_DIR" keys add "$IDENTITY" --secret-key --overwrite > /dev/null
ADMIN_ADDRESS=$(stellar --config-dir "$TMP_CONFIG_DIR" keys public-key "$IDENTITY")
echo "   Address: $ADMIN_ADDRESS"
echo "💰 Fund this account on mainnet before deploy (no Friendbot)."
echo ""

echo "🔨 stellar contract build"
stellar contract build
echo ""

echo "🚀 Deploying market-factory..."
FACTORY_ADDRESS=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/market_factory.wasm \
  --source "$IDENTITY" \
  --config-dir "$TMP_CONFIG_DIR" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")
echo "✅ FACTORY_ADDRESS=$FACTORY_ADDRESS"
echo ""

echo "⚙️  init (admin + market_wasm_hash)..."
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
echo "✅ Factory initialized"
echo ""

echo "🪙  Native XLM SAC..."
TOKEN_ADDRESS=$(stellar contract id asset \
  --asset native \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")
echo "✅ TOKEN_ADDRESS=$TOKEN_ADDRESS"
echo ""

echo "═══ Copy into root .env ═══"
echo "STELLAR_NETWORK=mainnet"
echo "STELLAR_RPC_URL=$RPC_URL"
echo "STELLAR_HORIZON_URL=https://horizon.stellar.org"
echo "STELLAR_NETWORK_PASSPHRASE=$NETWORK_PASSPHRASE"
echo "FACTORY_CONTRACT_ADDRESS=$FACTORY_ADDRESS"
echo "TOKEN_CONTRACT_ADDRESS=$TOKEN_ADDRESS"
echo "ORACLE_SECRET_KEY=$ORACLE_SECRET"
echo "ORACLE_PUBLIC_KEY=$ADMIN_ADDRESS"
echo ""

cat > .env.mainnet.deploy <<EOF
# deploy_factory_only.sh $(date -u +"%Y-%m-%dT%H:%M:%SZ")
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
echo "📁 stellar/.env.mainnet.deploy"
unset ORACLE_SECRET
