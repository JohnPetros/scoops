const PT_BR_PERCENTAGE_FORMATTER = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
})

export const formatPercentage = (value: number) =>
  PT_BR_PERCENTAGE_FORMATTER.format(value)

export const useFormatPercentage = () => formatPercentage
