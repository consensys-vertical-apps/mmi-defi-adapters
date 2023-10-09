export const filterMapSync = <Input, Return>(
  array: Input[],
  callback: (value: Input, index: number, array: Input[]) => Return | undefined,
): Return[] => {
  return array
    .map(callback)
    .filter((result) => result !== undefined) as Return[]
}

export const filterMapAsync = async <Input, Return>(
  array: Input[],
  callback: (
    value: Input,
    index: number,
    array: Input[],
  ) => Promise<Return | undefined>,
): Promise<Return[]> => {
  const results = await Promise.all(array.map(callback))
  return results.filter((result) => result !== undefined) as Return[]
}
