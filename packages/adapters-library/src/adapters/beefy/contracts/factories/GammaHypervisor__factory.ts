/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Interface, type ContractRunner } from "ethers";
import type {
  GammaHypervisor,
  GammaHypervisorInterface,
} from "../GammaHypervisor";

const _abi = [
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
    inputs: [],
    name: "getTotalAmounts",
    outputs: [
      {
        internalType: "uint256",
        name: "total0",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "total1",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token0",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [
      {
        internalType: "contract IERC20",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export class GammaHypervisor__factory {
  static readonly abi = _abi;
  static createInterface(): GammaHypervisorInterface {
    return new Interface(_abi) as GammaHypervisorInterface;
  }
  static connect(
    address: string,
    runner?: ContractRunner | null
  ): GammaHypervisor {
    return new Contract(address, _abi, runner) as unknown as GammaHypervisor;
  }
}
