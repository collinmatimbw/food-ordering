export function money(currency: string, value: number): string {
  if (currency === 'TSh') {
    return `TSh ${Math.round(value).toLocaleString('en-US')}`
  }
  return `${currency}${value.toFixed(2)}`
}

export function moneyParts(currency: string, value: number) {
  if (currency === 'TSh') {
    return { symbol: 'TSh', amount: Math.round(value).toLocaleString('en-US') }
  }
  return { symbol: currency, amount: value.toFixed(2) }
}
