import { Interface, type Log, ZeroAddress } from 'ethers'
import { describe, expect, it } from 'vitest'
import { parseUserEventLog } from './parse-user-event-log'

describe('parseUserEventLog', () => {
  const userAddr = '0x1234567890123456789012345678901234567890'

  describe('parsing from topics', () => {
    const eventAbi = null
    const eventAbiInterface = new Interface([
      'event TargetEvent(address indexed user, bytes someData)',
    ])

    it('parses user address', () => {
      const mockLog = eventAbiInterface.encodeEventLog('TargetEvent', [
        userAddr,
        '0x00000001',
      ]) as unknown as Log
      const topicIndex = 1

      const result = parseUserEventLog(mockLog, eventAbi, topicIndex)

      expect(result).toEqual(userAddr)
    })

    it('throws error if topic index is out of bounds', () => {
      const mockLog = eventAbiInterface.encodeEventLog('TargetEvent', [
        userAddr,
        '0x00000001',
      ]) as unknown as Log
      const topicIndex = 2

      expect(() => parseUserEventLog(mockLog, eventAbi, topicIndex)).toThrow(
        'Log does not have a topic at the given index',
      )
    })

    it('throws error if topic is not an address', () => {
      const mockLog = {
        topics: ['0xEventSignature...', '0xInvalidAddress'],
      } as unknown as Log
      const topicIndex = 1

      expect(() => parseUserEventLog(mockLog, eventAbi, topicIndex)).toThrow(
        'Topic is not an address',
      )
    })

    it('returns undefined if parsed address is ZeroAddress', () => {
      const mockLog = eventAbiInterface.encodeEventLog('TargetEvent', [
        ZeroAddress,
        '0x00000001',
      ]) as unknown as Log
      const topicIndex = 1

      const result = parseUserEventLog(mockLog, eventAbi, topicIndex)

      expect(result).toBeUndefined()
    })
  })

  describe('parsing from data', () => {
    const eventAbi =
      'event TargetEvent(uint256 indexed someValue, address user, bytes someData)'
    const eventAbiInterface = new Interface([eventAbi])

    it('parses user address', () => {
      const mockLog = eventAbiInterface.encodeEventLog('TargetEvent', [
        999,
        userAddr,
        '0x00000001',
      ]) as unknown as Log
      const userAddressIndex = 1

      const result = parseUserEventLog(mockLog, eventAbi, userAddressIndex)

      expect(result).toEqual(userAddr)
    })

    it('throws error if log does not match event abi', () => {
      const wrongEventAbiInterface = new Interface([
        'event WrongEvent(address user, bytes someData)',
      ])
      const mockLog = wrongEventAbiInterface.encodeEventLog('WrongEvent', [
        userAddr,
        '0x00000001',
      ]) as unknown as Log
      const userAddressIndex = 0

      expect(() =>
        parseUserEventLog(mockLog, eventAbi, userAddressIndex),
      ).toThrow('Log does not match event abi')
    })

    it('returns undefined if parsed address is ZeroAddress', () => {
      const mockLog = eventAbiInterface.encodeEventLog('TargetEvent', [
        999,
        ZeroAddress,
        '0x00000001',
      ]) as unknown as Log
      const userAddressIndex = 1

      const result = parseUserEventLog(mockLog, eventAbi, userAddressIndex)

      expect(result).toBeUndefined()
    })
  })
})
