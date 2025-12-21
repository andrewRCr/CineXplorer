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
 * Default toaster - bottom-right positioning for routine feedback.
 * Use for: save confirmations, background updates, non-critical notifications.
 */
export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
})

/**
 * Priority toaster - top-right positioning for important notifications.
 * Use for: auth success (login, registration, email verified), critical confirmations.
 * These toasts warrant user attention but aren't blocking errors.
 */
export const priorityToaster = createToaster({
  placement: "top-end",
  pauseOnPageIdle: true,
})

/**
 * Status-based styling for toasts using semantic tokens.
 * Uses solid layer background with colored left accent for readability over content.
 * Unlike inline alerts (10% opacity), toasts overlay UI and need higher contrast.
 */
type ToastType = "success" | "error" | "warning" | "info" | "loading"

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
const renderToast = (toast: { type?: string; title?: React.ReactNode; description?: React.ReactNode; action?: { label: string }; closable?: boolean }) => {
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
        toaster={toaster}
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
        toaster={priorityToaster}
        insetInline={{ mdDown: "4" }}
        // Override default top: 0 to account for navbar height
        style={{ top: topOffset, bottom: "auto" }}
      >
        {renderToast}
      </ChakraToaster>
    </Portal>
  )
}
