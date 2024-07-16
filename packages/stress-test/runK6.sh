#!/bin/bash

# Take the first positional argument as the configuration name
SCENARIO_NAME="$1"
CHAIN_NAME="$2"

# Check if a configuration name was provided
if [ -z "$SCENARIO_NAME" ]; then
  echo "No scenario specified, using default."
  SCENARIO_NAME="default"
fi

# Export the SCENARIO_NAME and CHAIN_NAME environment variables
export SCENARIO_NAME=$SCENARIO_NAME
export CHAIN_NAME=$CHAIN_NAME

SCRIPT_DIR=$(dirname "$0")

# Run k6 
k6 run "$SCRIPT_DIR/mainTest.js"
