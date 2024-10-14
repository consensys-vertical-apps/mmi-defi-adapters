# Contributing to MMI-Defi-Adapters

👍🎉 First and foremost, thank you for considering a contribution! 🎉👍

## Dependencies

We aim to keep this project lightweight and prioritize fetching DeFi data directly from the standard node JSON-RPC endpoints.

## Issues

We welcome issues for:

- General questions or assistance
- Enhancement suggestions
- Bug reports

## Pull Requests

Follow the steps below to contribute changes:

1. Fork this project and clone your fork to your local machine.
2. Create a new branch for your work:
   ```bash
   git checkout -b feature-or-fix-description
   ```
3. Implement your changes.
   - Please avoid introducing new third-party APIs or libraries.
   - Please save all addresses in checksum format by using getAddress(address) method from ethers
4. Commit your changes. Ideally, keep each change in an individual commit. Squash commits if necessary.
5. Before pushing, ensure your branch is up-to-date with the latest changes from `/consensys-vertical-apps/mmi-defi-adapters`:
   ```bash
   git fetch upstream HEAD
   git rebase FETCH_HEAD
   ```
6. Test your new adapter by running the scripts detailed in the README, e.g.,
   ```bash
   npm run positions <user address> -- -p <protocol id>
   npm run profits <user address> -- -p <protocol id>
   npm run prices
   ```
   and so on.
7. Before pushing, fix any linting issues by running:
   ```bash
   npm run fix
   ```
8. Push your changes to your fork.
9. Open a pull request from within GitHub. Allow maintainer edits and populate the pull request template. If you're unsure about any sections, feel free to leave them blank or mention your uncertainty.
10. We may request changes. If so, add the changes to your local branch in a new commit and push them to your fork.

Thank you for your contribution!
