import { Protocol } from '../..'
import { runProtocolTests } from '../../snapshotTestFramework'
import { testCases } from './tests'

runProtocolTests(Protocol.Stargate, testCases)
