export function rowsToCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const escape = (value: string | number | null | undefined): string => {
    const str = value == null ? "" : String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  return lines.join("\r\n");
}
