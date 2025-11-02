"use client"

import { ChakraProvider } from "@chakra-ui/react"
import {
  ColorModeProvider,
  type ColorModeProviderProps,
} from "./color-mode"
import { ThemeSelectProvider } from "./theme-provider"
import { system } from "@/theme"

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ThemeSelectProvider>
        <ColorModeProvider {...props} />
      </ThemeSelectProvider>
    </ChakraProvider>
  )
}
