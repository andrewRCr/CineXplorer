"use client"

import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"
import { ThemeSelectProvider } from "./theme-provider"

export function Provider(props: ColorModeProviderProps) {
  return (
    <ThemeSelectProvider>
      <ColorModeProvider {...props} />
    </ThemeSelectProvider>
  )
}
