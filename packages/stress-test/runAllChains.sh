#!/bin/bash

# List of all chain names
chains=("ethereum" "optimism" "bsc" "polygon" "fantom" "base" "arbitrum" "avalanche" "linea")

# Scenario name to use
scenario="${1:-fifty_requests}"

# Function to run the test for a given chain
run_test() {
  local chain=$1
  echo "Running test for chain: $chain with scenario: $scenario"
  SCENARIO_NAME=$scenario CHAIN_NAME=$chain ./packages/stress-test/runK6.sh $scenario $chain
}

# Run the tests sequentially
for chain in "${chains[@]}"; do
  run_test $chain
done

echo "All tests completed."
