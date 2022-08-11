set -o allexport; source ./.env; set +o allexport;

export NODE_OPTIONS="--max-old-space-size=15120"
export $(grep -v '^#' .env | xargs -d '\n')

# Fork block number can be pinned via FORK_BLOCK_NUMBER variable
# It can be useful when you want to have stable nonce (=> contract numbers) when you're using well-known private key on testnet
FORK_BLOCK_NUMBER=""
if [ -n "$ETH_TESTNET_BLOCK" ]; then
    FORK_BLOCK_NUMBER="--fork-block-number ${ETH_TESTNET_BLOCK}"
fi
npx hardhat node --fork $ETH_TESTNET_PROVIDER ${FORK_BLOCK_NUMBER}
