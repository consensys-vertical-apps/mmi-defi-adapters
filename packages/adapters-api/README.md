# Package Description
This package serves as the entry point for an API that uses the logic inside the adapters library and is supported by the database maintained by the workers.

# Architecture Overview

A single process running a Hono API that exposes the following endpoints:

## `/positions/:userAddress`
Based on the value of `userAddress` (and optionally a set of query string parameters), returns all the supported DeFi positions for that address.

## `/support`
Returns a list of supported protocols

## `/user-pools/:userAddress`
Returns a list of supported pools that the address has interacted with.

## `/health`
Returns a simple message to signal that the service is healthy.

## `/metrics`
Returns the output of the prometheus client.

## Database

This service only reads from the `logs` table defined in the workers package.
