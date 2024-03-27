[@metamask-institutional/defi-adapters](../README.md) / deepPartial

# Module: deepPartial

## Table of contents

### Type Aliases

- [DeepPartial](deepPartial.md#deeppartial)

## Type Aliases

### DeepPartial

Ƭ **DeepPartial**<`T`\>: { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]\> : T[P] }

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[deepPartial.ts:1](https://github.com/consensys-vertical-apps/mmi-defi-adapters/blob/main/src/types/deepPartial.ts#L1)
