const VALID_LENGTHS = [8, 12, 13]
const EAN13_LENGTH = 13

export const digitsOnly = (value: string) => value.replace(/\D/g, '')

const checksumMatches = (digits: string) => {
  const body = digits.slice(0, -1)
  const check = Number(digits.slice(-1))
  const sum = [...body].reverse().reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}

export const isValidBarcode = (value: string) => {
  const digits = digitsOnly(value)
  return VALID_LENGTHS.includes(digits.length) && checksumMatches(digits)
}

export const toEan13 = (value: string) => digitsOnly(value).padStart(EAN13_LENGTH, '0')
