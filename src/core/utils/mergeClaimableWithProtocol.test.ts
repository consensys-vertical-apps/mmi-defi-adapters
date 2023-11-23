import { DefiPositionResponse } from '../../types/response'
import { mergeClaimableWithProtocol } from './mergeClaimableWithProtocol'

describe('mergeClaimableWithProtocol', () => {
  it('should merge rewards into corresponding non-reward positions', () => {
    const positions = [
      // Add a non-reward position
      {
        success: true,
        positionType: 'non-reward',
        tokens: [{ address: 'token1', tokens: ['token1-data'] }],
      },
      // Add a reward position that corresponds to the above non-reward position
      {
        success: true,
        positionType: 'reward',
        tokens: [
          { address: 'token1', tokens: ['reward1-data'], type: 'claimable' },
        ],
      },
    ]

    const expected = [
      // Expected merged position
      {
        success: true,
        positionType: 'non-reward',
        tokens: [
          { address: 'token1', tokens: ['reward1-data', 'token1-data'] },
        ],
      },
    ]

    expect(
      mergeClaimableWithProtocol(
        positions as unknown as DefiPositionResponse[],
      ),
    ).toEqual(expected)
  })

  it('should return non-reward positions as is if there are no corresponding rewards', () => {
    const positions = [
      // Non-reward position without a corresponding reward
      {
        success: true,
        positionType: 'non-reward',
        tokens: [{ address: 'token2', tokens: ['token2-data'] }],
      },
    ]

    expect(
      mergeClaimableWithProtocol(
        positions as unknown as DefiPositionResponse[],
      ),
    ).toEqual(positions)
  })

  it('should return rewards if there are no matching non-reward positions', () => {
    const positions = [
      // Reward position without a corresponding non-reward position
      {
        success: true,
        positionType: 'reward',
        tokens: [
          { address: 'token3', tokens: ['reward3-data'], type: 'claimable' },
        ],
      },
    ]

    expect(
      mergeClaimableWithProtocol(
        positions as unknown as DefiPositionResponse[],
      ),
    ).toEqual(positions)
  })
})
