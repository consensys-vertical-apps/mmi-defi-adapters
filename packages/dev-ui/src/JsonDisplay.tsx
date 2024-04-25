export const JsonDisplay = ({ data }: { data: unknown }) => {
  return (
    <pre>
      {JSON.stringify(
        data,
        (_, value) =>
          typeof value === 'bigint' ? `${value.toString()}n` : value,
        2,
      )}
    </pre>
  )
}
