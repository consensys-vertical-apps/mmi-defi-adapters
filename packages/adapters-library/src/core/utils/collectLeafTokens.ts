/**
 * Recursively traverses a position or token object and collects all the "leaf" tokens.
 * A "leaf" token is defined as a token that does not have any underlying tokens (i.e., its `tokens` array is empty or undefined).
 *
 * @param {Object} token - The root token object to start the traversal from.
 * @param {Array} [token.tokens] - An optional array of underlying tokens. Each underlying token can itself have further underlying tokens, creating a nested structure.
 *
 * @returns {Object[]} An array of leaf tokens. Each leaf token is an object that does not have any underlying tokens.
 *
 * @example
 * // Example token structure
 * const token = {
 *   name: 'RootToken'
 *   tokens: [
 *     {
 *       name: 'MiddleToken1'
 *       tokens: [
 *         { name: 'LeafToken1', tokens: [] },
 *         { name: 'LeafToken2', tokens: [] }
 *       ],
 *     },
 *     { name: 'LeafToken3', tokens: [] }
 *   ],
 * };
 *
 * const leaves = collectLeafTokens(token);
 * console.log(leaves);
 * // Output:
 * // [
 * //   { name: 'LeafToken1', underlyingTokens: [] },
 * //   { name: 'LeafToken2', underlyingTokens: [] },
 * //   { name: 'LeafToken3', underlyingTokens: [] }
 * // ]
 */
export const collectLeafTokens = <T extends { tokens?: T[] }>(
  token: T,
): T[] => {
  const leaves: T[] = []

  // Internal recursive function to traverse the structure
  function traverse(currentToken: T) {
    // If no tokens exist or tokens array is empty, it's a leaf
    if (!currentToken.tokens || currentToken.tokens.length === 0) {
      leaves.push(currentToken)
    } else {
      // Otherwise, traverse the nested tokens
      currentToken.tokens.forEach(traverse)
    }
  }

  // Start traversal
  traverse(token)

  // Return all collected leaf tokens
  return leaves
}
