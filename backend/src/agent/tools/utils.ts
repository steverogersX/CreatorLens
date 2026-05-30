export function buildSelect<TExtra extends string>(
  base: Record<string, unknown>,
  extras: Record<TExtra, unknown>,
  fields: TExtra[],
): Record<string, unknown> {
  const select = { ...base };
  for (const field of fields) {
    select[field] = extras[field];
  }
  return select;
}
