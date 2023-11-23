import { DefiPositionResponse } from '../../defiProvider'
import {
  Underlying,
  ProtocolPosition,
  PositionType,
  TokenType,
} from '../../types/adapter'
import { DisplayPosition } from '../../types/response'

export function mergeClaimableWithProtocol(positions: DefiPositionResponse[]) {
  const rewardMap: Record<string, DisplayPosition<Underlying>[]> = {}
  const nonRewardPositions: DefiPositionResponse[] = []
  const mergedResponse: DefiPositionResponse[] = []

  // Build the reward map and separate non-reward positions
  positions.forEach((position) => {
    if (position.success) {
      if (position.positionType === PositionType.Reward) {
        position.tokens.forEach(({ address: lpTokenAddress, tokens, type }) => {
          if (type === TokenType.Reward) {
            rewardMap[lpTokenAddress] = [
              ...(rewardMap[lpTokenAddress] || []),
              ...(tokens || []),
            ]
          }
        })
      } else {
        nonRewardPositions.push(position)
      }
    }
  })

  // Merge rewards into non-reward positions
  nonRewardPositions.forEach((position) => {
    if (position.success) {
      const mergedTokens = position.tokens.map((lpPosition) => {
        const rewards = rewardMap[lpPosition.address]
        const mergedTokens = rewards
          ? [...rewards, ...(lpPosition.tokens || [])]
          : lpPosition.tokens
        return { ...lpPosition, tokens: mergedTokens }
      })
      mergedResponse.push({
        ...position,
        tokens: (mergedTokens as DisplayPosition<ProtocolPosition>[]) || [],
      })
    } else {
      mergedResponse.push(position)
    }
  })

  // Add rewards that were not merged
  Object.keys(rewardMap).forEach((lpTokenAddress) => {
    if (
      !nonRewardPositions.some(
        (pos) =>
          pos.success &&
          pos.tokens.some((tok) => tok.address === lpTokenAddress),
      )
    ) {
      const miscellaneousPosition = positions.find(
        (pos) =>
          pos.success &&
          pos.tokens.find((lpPosition) => lpPosition.address == lpTokenAddress),
      )

      if (miscellaneousPosition?.success) {
        const lpToken = miscellaneousPosition.tokens.find(
          (token) => token.address == lpTokenAddress,
        )

        if (lpToken) {
          mergedResponse.push({
            ...miscellaneousPosition,
            success: true,
            tokens: [
              { ...lpToken, tokens: rewardMap[lpTokenAddress] },
            ] as DisplayPosition<ProtocolPosition>[],
          })
        }
      }
    }
  })

  return mergedResponse
}
