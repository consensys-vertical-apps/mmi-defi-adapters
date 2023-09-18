export const filterMap = <Input, Return>(
  array: Input[],
  callback: (value: Input, index: number, array: Input[]) => Return | undefined,
): Return[] => {
  return array
    .map(callback)
    .filter((result) => result !== undefined) as Return[]
}
