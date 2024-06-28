import { getAddress } from "ethers"
import { Chain } from "../../../../core/constants/chains"
import { E_ADDRESS } from "../../../../core/constants/E_ADDRESS"

export interface TokenInfo {
    protocolToken: string
    underlyingToken: string
}

export const TokenAddresses: Partial<Record<Chain, TokenInfo>> = {
    [Chain.Ethereum]: {
        protocolToken: getAddress('0xbf5495Efe5DB9ce00f80364C8B423567e58d2110'),
        underlyingToken: getAddress(E_ADDRESS),
    },
    [Chain.Bsc]: {
        protocolToken: getAddress('0x2416092f143378750bb29b79ed961ab195cceea5'),
        underlyingToken: getAddress('0x2170Ed0880ac9A755fd29B2688956BD959F933F8'),
    },
    [Chain.Base]: {
        protocolToken: getAddress('0x2416092f143378750bb29b79ed961ab195cceea5'),
        underlyingToken: getAddress(E_ADDRESS),
    },
    [Chain.Arbitrum]: {
        protocolToken: getAddress('0x2416092f143378750bb29b79ed961ab195cceea5'),
        underlyingToken: getAddress(E_ADDRESS),
    },
    [Chain.Linea]: {
        protocolToken: getAddress('0x2416092f143378750bb29b79ed961ab195cceea5'),
        underlyingToken: getAddress(E_ADDRESS),
    },
}

export const BalancerRateProviderAddress = getAddress('0x387dBc0fB00b26fb085aa658527D5BE98302c84C')
export const xRenzoDeposit: Partial<Record<Chain, string>> = {
    [Chain.Bsc]: getAddress('0xf25484650484DE3d554fB0b7125e7696efA4ab99'),
    [Chain.Base]: getAddress('0xf25484650484DE3d554fB0b7125e7696efA4ab99'),
    [Chain.Arbitrum]: getAddress('0xf25484650484DE3d554fB0b7125e7696efA4ab99'),
    [Chain.Linea]: getAddress('0x4D7572040B84b41a6AA2efE4A93eFFF182388F88'),
}

// export const WithdrawlQueueAddress = getAddress('0x5efc9D10E42FB517456f4ac41EB5e2eBe42C8918')
// export const RestakeManagerAddress = getAddress('0x74a09653A083691711cF8215a6ab074BB4e99ef5')
