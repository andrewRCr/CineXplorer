"use client"

import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react"

/**
 * Toast status types for styling and duration configuration.
 */
type ToastType = "success" | "error" | "warning" | "info" | "loading"

/**
 * Policy-based duration defaults (in milliseconds).
 * From strategy-component-styling.md:
 * - Success: 4 seconds (quick confirmation)
 * - Info: 5 seconds (time to read)
 * - Warning: 6 seconds (needs attention)
 * - Error: 8 seconds (critical, needs action)
 * - Loading: Persists until dismissed programmatically
 */
const statusDurations: Record<ToastType, number | undefined> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
  loading: undefined, // Persists until dismissed
}

// Toast options type (matches Chakra's toast options)
type ToastOptions = {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  duration?: number
  closable?: boolean
  action?: { label: string; onClick: () => void }
  [key: string]: unknown
}

/**
 * Wraps a Chakra toaster with policy-based duration defaults.
 * Call sites get policy compliance by default, with override capability.
 *
 * Usage:
 *   toaster.success({ title: "Saved" })           // Uses 4s default
 *   toaster.success({ title: "Saved", duration: 6000 })  // Override to 6s
 */
function wrapWithDurationDefaults(baseToaster: ReturnType<typeof createToaster>) {
  const withDefaults = (type: ToastType) => (options: ToastOptions) => {
    const defaultDuration = statusDurations[type]
    return baseToaster[type]({
      ...options,
      // Use explicit duration if provided, otherwise use policy default
      duration: options.duration ?? defaultDuration,
    })
  }

  return {
    // Preserve all base toaster functionality
    ...baseToaster,
    // Override status methods with duration-aware versions
    success: withDefaults("success"),
    error: withDefaults("error"),
    warning: withDefaults("warning"),
    info: withDefaults("info"),
    loading: withDefaults("loading"),
  }
}

// Create raw toasters (internal use only)
const rawToaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
})

const rawPriorityToaster = createToaster({
  placement: "top-end",
  pauseOnPageIdle: true,
})

/**
 * Default toaster - bottom-right positioning for routine feedback.
 * Use for: save confirmations, background updates, non-critical notifications.
 * Duration defaults applied per status type (see statusDurations).
 */
export const toaster = wrapWithDurationDefaults(rawToaster)

/**
 * Priority toaster - top-right positioning for important notifications.
 * Use for: auth success (login, registration, email verified), critical confirmations.
 * Duration defaults applied per status type (see statusDurations).
 */
export const priorityToaster = wrapWithDurationDefaults(rawPriorityToaster)

/**
 * Status-based styling for toasts using semantic tokens.
 * Uses solid layer background with colored left accent for readability over content.
 * Unlike inline alerts (10% opacity), toasts overlay UI and need higher contrast.
 */
const statusStyles: Record<ToastType, { accentColor: string; titleColor: string }> = {
  success: { accentColor: "success", titleColor: "success" },
  error: { accentColor: "destructive", titleColor: "destructive" },
  warning: { accentColor: "warning", titleColor: "warning" },
  info: { accentColor: "info", titleColor: "info" },
  loading: { accentColor: "info", titleColor: "info" },
}

/**
 * Shared toast renderer for consistent styling across both toaster instances.
 */
const renderToast = (toast: { type?: string; title?: React.ReactNode; description?: React.ReactNode; action?: { label: string; onClick?: () => void }; closable?: boolean }) => {
  const status = (toast.type as ToastType) || "info"
  const styles = statusStyles[status]

  return (
    <Toast.Root
      width={{ md: "sm" }}
      bg="layer-03"
      borderWidth="1px"
      borderColor="border"
      borderLeftWidth="4px"
      borderLeftColor={styles.accentColor}
      borderRadius="md"
      boxShadow="shadow-md"
      p="4"
      gap="3"
    >
      {toast.type === "loading" ? (
        <Spinner size="sm" color={styles.titleColor} />
      ) : (
        <Toast.Indicator color={styles.titleColor} />
      )}
      <Stack gap="1" flex="1" maxWidth="100%">
        {toast.title && (
          <Toast.Title
            fontWeight="semibold"
            fontSize="sm"
            color={styles.titleColor}
          >
            {toast.title}
          </Toast.Title>
        )}
        {toast.description && (
          <Toast.Description fontSize="sm" color="foreground">
            {toast.description}
          </Toast.Description>
        )}
      </Stack>
      {toast.action && (
        <Toast.ActionTrigger
          color="tertiary"
          fontWeight="medium"
          fontSize="sm"
          _hover={{ color: "tertiary-hover" }}
          onClick={toast.action.onClick}
        >
          {toast.action.label}
        </Toast.ActionTrigger>
      )}
      {toast.closable && (
        <Toast.CloseTrigger
          color="on-muted"
          p="1"
          borderRadius="sm"
          _hover={{ bg: "layer-hover-02", color: "foreground" }}
        />
      )}
    </Toast.Root>
  )
}

/**
 * Layout-aware offsets for toaster positioning.
 * Uses CSS calc with layout tokens so toasts don't overlap navbar/footer.
 */
const topOffset = "calc(var(--chakra-sizes-layout-navbar) + var(--chakra-spacing-4))"
const bottomOffset = "calc(var(--chakra-sizes-layout-footer) + var(--chakra-spacing-4))"

/**
 * Default Toaster - renders bottom-right toasts.
 * Positioned above footer using layout token.
 * Include this in your app layout.
 */
export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster
        toaster={rawToaster}
        insetInline={{ mdDown: "4" }}
        // Override default bottom: 0 to account for footer height
        style={{ bottom: bottomOffset, top: "auto" }}
      >
        {renderToast}
      </ChakraToaster>
    </Portal>
  )
}

/**
 * Priority Toaster - renders top-right toasts.
 * Positioned below navbar using layout token.
 * Include this in your app layout alongside the default Toaster.
 */
export const PriorityToaster = () => {
  return (
    <Portal>
      <ChakraToaster
        toaster={rawPriorityToaster}
        insetInline={{ mdDown: "4" }}
        // Override default top: 0 to account for navbar height
        style={{ top: topOffset, bottom: "auto" }}
      >
        {renderToast}
      </ChakraToaster>
    </Portal>
  )
}
