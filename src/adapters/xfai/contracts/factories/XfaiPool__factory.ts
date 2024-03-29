/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type { Signer, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../common";
import type { XfaiPool, XfaiPoolInterface } from "../XfaiPool";

const _abi = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_reserve",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_weight",
        type: "uint256",
      },
    ],
    name: "Sync",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_reserve",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_weight",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_blockTimestamp",
        type: "uint256",
      },
    ],
    name: "Write",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "subtractedValue",
        type: "uint256",
      },
    ],
    name: "decreaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getStates",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getXfaiCore",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "addedValue",
        type: "uint256",
      },
    ],
    name: "increaseAllowance",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
      {
        internalType: "address",
        name: "_xfaiFactory",
        type: "address",
      },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_token",
        type: "address",
      },
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_value",
        type: "uint256",
      },
    ],
    name: "linkedTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "_amount",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "poolToken",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_newReserve",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_newWeight",
        type: "uint256",
      },
    ],
    name: "update",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x6080604052600160075534801561001557600080fd5b50611726806100256000396000f3fe608060405234801561001057600080fd5b50600436106101515760003560e01c8063485cc955116100cd578063a457c2d711610081578063cbdf382c11610066578063cbdf382c146102d0578063d8ab8274146102f0578063dd62ed3e1461030b57600080fd5b8063a457c2d7146102aa578063a9059cbb146102bd57600080fd5b80637f86e3b9116100b25780637f86e3b91461026257806395d89b411461028f5780639dc29fac1461029757600080fd5b8063485cc9551461021957806370a082311461022c57600080fd5b80632fb565e811610124578063341ce0cc11610109578063341ce0cc146101e057806339509351146101f357806340c10f191461020657600080fd5b80632fb565e8146101bc578063313ce567146101d157600080fd5b806306fdde0314610156578063095ea7b31461017457806318160ddd1461019757806323b872dd146101a9575b600080fd5b61015e610351565b60405161016b9190611317565b60405180910390f35b61018761018236600461138d565b6103e3565b604051901515815260200161016b565b6002545b60405190815260200161016b565b6101876101b73660046113b9565b6103fd565b6101cf6101ca3660046113fa565b610421565b005b6040516012815260200161016b565b6101cf6101ee3660046113b9565b6104f9565b61018761020136600461138d565b610776565b6101cf61021436600461138d565b6107c2565b6101cf61022736600461141c565b61085c565b61019b61023a366004611455565b73ffffffffffffffffffffffffffffffffffffffff1660009081526020819052604090205490565b61026a6109aa565b60405173ffffffffffffffffffffffffffffffffffffffff909116815260200161016b565b61015e610a43565b6101cf6102a536600461138d565b610a52565b6101876102b836600461138d565b610ae7565b6101876102cb36600461138d565b610bb8565b60095461026a9073ffffffffffffffffffffffffffffffffffffffff1681565b6005546006546040805192835260208301919091520161016b565b61019b61031936600461141c565b73ffffffffffffffffffffffffffffffffffffffff918216600090815260016020908152604080832093909416825291909152205490565b60606003805461036090611479565b80601f016020809104026020016040519081016040528092919081815260200182805461038c90611479565b80156103d95780601f106103ae576101008083540402835291602001916103d9565b820191906000526020600020905b8154815290600101906020018083116103bc57829003601f168201915b5050505050905090565b6000336103f1818585610bc6565b60019150505b92915050565b60003361040b858285610d7a565b610416858585610e51565b506001949350505050565b600061042b6109aa565b90503373ffffffffffffffffffffffffffffffffffffffff8216146104b1576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601260248201527f58666169506f6f6c3a204e4f545f434f5245000000000000000000000000000060448201526064015b60405180910390fd5b6005839055600682905560408051848152602081018490527fcf2aa50876cdfbb541206f89af0ee78d44a2abf8d328e37fa4917f982149848a910160405180910390a1505050565b60006105036109aa565b90503373ffffffffffffffffffffffffffffffffffffffff821614610584576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601260248201527f58666169506f6f6c3a204e4f545f434f5245000000000000000000000000000060448201526064016104a8565b60008473ffffffffffffffffffffffffffffffffffffffff163b11610605576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f58666169506f6f6c3a205452414e534645525f4641494c45440000000000000060448201526064016104a8565b6040805173ffffffffffffffffffffffffffffffffffffffff8581166024830152604480830186905283518084039091018152606490920183526020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167fa9059cbb00000000000000000000000000000000000000000000000000000000179052915160009283929088169161069c91906114cc565b6000604051808303816000865af19150503d80600081146106d9576040519150601f19603f3d011682016040523d82523d6000602084013e6106de565b606091505b509150915081801561070857508051158061070857508080602001905181019061070891906114e8565b61076e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601960248201527f58666169506f6f6c3a205452414e534645525f4641494c45440000000000000060448201526064016104a8565b505050505050565b33600081815260016020908152604080832073ffffffffffffffffffffffffffffffffffffffff871684529091528120549091906103f190829086906107bd90879061150a565b610bc6565b60006107cc6109aa565b90503373ffffffffffffffffffffffffffffffffffffffff82161461084d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601260248201527f58666169506f6f6c3a204e4f545f434f5245000000000000000000000000000060448201526064016104a8565b61085783836110c1565b505050565b6007546001146108c8576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601460248201527f58666169506f6f6c3a204445585f53454544454400000000000000000000000060448201526064016104a8565b6009805473ffffffffffffffffffffffffffffffffffffffff8085167fffffffffffffffffffffffff000000000000000000000000000000000000000092831617909255600880549284169290911691909117905560408051808201909152601481527f58666169204c697175696469747920546f6b656e000000000000000000000000602082015260039061095e90826115b9565b5060408051808201909152600781527f584641492d4c500000000000000000000000000000000000000000000000000060208201526004906109a090826115b9565b5050600260075550565b600854604080517f7f86e3b9000000000000000000000000000000000000000000000000000000008152905160009273ffffffffffffffffffffffffffffffffffffffff1691637f86e3b99160048083019260209291908290030181865afa158015610a1a573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610a3e91906116d3565b905090565b60606004805461036090611479565b6000610a5c6109aa565b90503373ffffffffffffffffffffffffffffffffffffffff821614610add576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601260248201527f58666169506f6f6c3a204e4f545f434f5245000000000000000000000000000060448201526064016104a8565b6108578383611137565b33600081815260016020908152604080832073ffffffffffffffffffffffffffffffffffffffff8716845290915281205490919083811015610bab576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f7760448201527f207a65726f00000000000000000000000000000000000000000000000000000060648201526084016104a8565b6104168286868403610bc6565b6000336103f1818585610e51565b73ffffffffffffffffffffffffffffffffffffffff8316610c68576040517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f2061646460448201527f726573730000000000000000000000000000000000000000000000000000000060648201526084016104a8565b73ffffffffffffffffffffffffffffffffffffffff8216610d0b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f20616464726560448201527f737300000000000000000000000000000000000000000000000000000000000060648201526084016104a8565b73ffffffffffffffffffffffffffffffffffffffff83811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591015b60405180910390a3505050565b73ffffffffffffffffffffffffffffffffffffffff8381166000908152600160209081526040808320938616835292905220547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8114610e4b5781811015610e3e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601d60248201527f45524332303a20696e73756666696369656e7420616c6c6f77616e636500000060448201526064016104a8565b610e4b8484848403610bc6565b50505050565b73ffffffffffffffffffffffffffffffffffffffff8316610ef4576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f20616460448201527f647265737300000000000000000000000000000000000000000000000000000060648201526084016104a8565b73ffffffffffffffffffffffffffffffffffffffff8216610f97576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201527f657373000000000000000000000000000000000000000000000000000000000060648201526084016104a8565b73ffffffffffffffffffffffffffffffffffffffff83166000908152602081905260409020548181101561104d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e742065786365656473206260448201527f616c616e6365000000000000000000000000000000000000000000000000000060648201526084016104a8565b73ffffffffffffffffffffffffffffffffffffffff848116600081815260208181526040808320878703905593871680835291849020805487019055925185815290927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a350505050565b80600260008282546110d3919061150a565b909155505073ffffffffffffffffffffffffffffffffffffffff8216600081815260208181526040808320805486019055518481527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef910160405180910390a35050565b73ffffffffffffffffffffffffffffffffffffffff82166111da576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602160248201527f45524332303a206275726e2066726f6d20746865207a65726f2061646472657360448201527f730000000000000000000000000000000000000000000000000000000000000060648201526084016104a8565b73ffffffffffffffffffffffffffffffffffffffff821660009081526020819052604090205481811015611290576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602260248201527f45524332303a206275726e20616d6f756e7420657863656564732062616c616e60448201527f636500000000000000000000000000000000000000000000000000000000000060648201526084016104a8565b73ffffffffffffffffffffffffffffffffffffffff83166000818152602081815260408083208686039055600280548790039055518581529192917fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9101610d6d565b60005b8381101561130e5781810151838201526020016112f6565b50506000910152565b60208152600082518060208401526113368160408501602087016112f3565b601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169190910160400192915050565b73ffffffffffffffffffffffffffffffffffffffff8116811461138a57600080fd5b50565b600080604083850312156113a057600080fd5b82356113ab81611368565b946020939093013593505050565b6000806000606084860312156113ce57600080fd5b83356113d981611368565b925060208401356113e981611368565b929592945050506040919091013590565b6000806040838503121561140d57600080fd5b50508035926020909101359150565b6000806040838503121561142f57600080fd5b823561143a81611368565b9150602083013561144a81611368565b809150509250929050565b60006020828403121561146757600080fd5b813561147281611368565b9392505050565b600181811c9082168061148d57607f821691505b6020821081036114c6577f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b50919050565b600082516114de8184602087016112f3565b9190910192915050565b6000602082840312156114fa57600080fd5b8151801515811461147257600080fd5b808201808211156103f7577f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b601f82111561085757600081815260208120601f850160051c8101602086101561159a5750805b601f850160051c820191505b8181101561076e578281556001016115a6565b815167ffffffffffffffff8111156115d3576115d3611544565b6115e7816115e18454611479565b84611573565b602080601f83116001811461163a57600084156116045750858301515b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600386901b1c1916600185901b17855561076e565b6000858152602081207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08616915b8281101561168757888601518255948401946001909101908401611668565b50858210156116c357878501517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600388901b60f8161c191681555b5050505050600190811b01905550565b6000602082840312156116e557600080fd5b81516114728161136856fea264697066735822122086dc84f8c094de99b8c200956571c5e76e47a56b086a25dd50028b23ce755c3964736f6c63430008130033";

type XfaiPoolConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: XfaiPoolConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class XfaiPool__factory extends ContractFactory {
  constructor(...args: XfaiPoolConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(overrides || {});
  }
  override deploy(overrides?: NonPayableOverrides & { from?: string }) {
    return super.deploy(overrides || {}) as Promise<
      XfaiPool & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): XfaiPool__factory {
    return super.connect(runner) as XfaiPool__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): XfaiPoolInterface {
    return new Interface(_abi) as XfaiPoolInterface;
  }
  static connect(address: string, runner?: ContractRunner | null): XfaiPool {
    return new Contract(address, _abi, runner) as unknown as XfaiPool;
  }
}
