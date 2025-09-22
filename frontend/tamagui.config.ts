import { config } from '@tamagui/config'
import { createTamagui } from '@tamagui/core'

const tamaguiConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    // Custom SafeRide theme
    saferide_dark: {
      ...config.themes.dark,
      background: '#1a1a1a',
      color: '#ffffff',
      primary: '#FF3B30',
      secondary: '#007BFF',
      success: '#28A745',
      warning: '#FF9800',
      accent: '#25D366', // WhatsApp green
    },
  },
  defaultTheme: 'saferide_dark',
})

export default tamaguiConfig

export type Conf = typeof tamaguiConfig

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}