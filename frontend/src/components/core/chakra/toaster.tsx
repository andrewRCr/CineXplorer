"use client"

import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react"

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
})

/**
 * Status-based styling for toasts using semantic tokens.
 * Matches the toast recipe pattern: 10% opacity backgrounds with semantic borders.
 */
type ToastType = "success" | "error" | "warning" | "info" | "loading"

const statusStyles: Record<ToastType, { bg: string; borderColor: string; color: string }> = {
  success: { bg: "success/10", borderColor: "success", color: "success" },
  error: { bg: "destructive/10", borderColor: "destructive", color: "destructive" },
  warning: { bg: "warning/10", borderColor: "warning", color: "warning" },
  info: { bg: "info/10", borderColor: "info", color: "info" },
  loading: { bg: "info/10", borderColor: "info", color: "info" },
}

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => {
          const status = (toast.type as ToastType) || "info"
          const styles = statusStyles[status]

          return (
            <Toast.Root
              width={{ md: "sm" }}
              bg={styles.bg}
              borderWidth="1px"
              borderColor={styles.borderColor}
              borderRadius="md"
              boxShadow="shadow-md"
              p="4"
              gap="3"
            >
              {toast.type === "loading" ? (
                <Spinner size="sm" color={styles.color} />
              ) : (
                <Toast.Indicator color={styles.color} />
              )}
              <Stack gap="1" flex="1" maxWidth="100%">
                {toast.title && (
                  <Toast.Title
                    fontWeight="semibold"
                    fontSize="sm"
                    color={styles.color}
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
        }}
      </ChakraToaster>
    </Portal>
  )
}
