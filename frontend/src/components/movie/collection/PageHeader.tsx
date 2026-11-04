import {
  forwardRef,
  type ReactNode,
  type ElementType,
  useState,
  useEffect,
  useRef,
} from "react";
import { flushSync } from "react-dom";
import { Box, type BoxProps } from "@chakra-ui/react";

type PageHeaderOwnProps<T extends ElementType = ElementType> = {
  as?: T;
  title: string | { main: string; secondary?: string };
  showAccent?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  children?: ReactNode;
};

type PageHeaderProps<T extends ElementType> = PageHeaderOwnProps<T> &
  Omit<BoxProps, keyof PageHeaderOwnProps>;

const sizeStyles = {
  sm: { fontSize: "xl", minHeight: "40px" },
  md: { fontSize: "2xl", minHeight: "50px" },
  lg: { fontSize: "3xl", minHeight: "60px" },
  xl: { fontSize: "4xl", minHeight: "70px" },
};

const PageHeader = forwardRef(
  <T extends ElementType = "div">(
    {
      as,
      title,
      showAccent = true,
      size = "lg",
      children,
      ...props
    }: PageHeaderProps<T>,
    ref: React.Ref<HTMLElement>,
  ) => {
    const Component = as || "div";
    const styles = sizeStyles[size];
    const [animationPhase, setAnimationPhase] = useState<
      "reset" | "ready" | "animating"
    >("reset");

    // Refs to track timer IDs for cleanup
    const titleTimersRef = useRef<{
      ready?: ReturnType<typeof setTimeout>;
      animating?: ReturnType<typeof setTimeout>;
    }>({});
    const mountTimersRef = useRef<{
      initial?: ReturnType<typeof setTimeout>;
      animating?: ReturnType<typeof setTimeout>;
    }>({});

    // Trigger animation on title change
    useEffect(() => {
      // Capture ref for cleanup (ESLint react-hooks/exhaustive-deps)
      const timers = titleTimersRef.current;
      // Unmount guard - prevents state updates after component unmounts
      let cancelled = false;

      // Use microtasks to avoid React warning while keeping flushSync functionality
      queueMicrotask(() => {
        if (cancelled) return;

        // Step 1: Force reset with no transition
        flushSync(() => {
          setAnimationPhase("reset");
        });

        // Step 2: Enable transition but stay at 0%
        timers.ready = setTimeout(() => {
          if (cancelled) return;
          flushSync(() => {
            setAnimationPhase("ready");
          });

          // Step 3: Animate to 100%
          timers.animating = setTimeout(() => {
            if (cancelled) return;
            setAnimationPhase("animating");
          }, 50);
        }, 50);
      });

      return () => {
        cancelled = true;
        if (timers.ready) clearTimeout(timers.ready);
        if (timers.animating) clearTimeout(timers.animating);
      };
    }, [title]);

    // Trigger initial animation on mount
    useEffect(() => {
      // Capture ref for cleanup (ESLint react-hooks/exhaustive-deps)
      const timers = mountTimersRef.current;
      // Unmount guard - prevents state updates after component unmounts
      let cancelled = false;

      timers.initial = setTimeout(() => {
        if (cancelled) return;
        setAnimationPhase("ready");
        timers.animating = setTimeout(() => {
          if (cancelled) return;
          setAnimationPhase("animating");
        }, 50);
      }, 50);

      return () => {
        cancelled = true;
        if (timers.initial) clearTimeout(timers.initial);
        if (timers.animating) clearTimeout(timers.animating);
      };
    }, []);

    // Handle title structure - string or object with main/secondary parts
    const titleData =
      typeof title === "string" ? { main: title, secondary: undefined } : title;

    return (
      <Box
        ref={ref}
        as={Component}
        flexShrink={0}
        mb={2}
        minHeight={styles.minHeight}
        display="flex"
        alignItems="flex-end"
        width="100%"
        {...props}
      >
        <Box
          fontSize={styles.fontSize}
          fontWeight="normal"
          fontStyle="italic"
          fontFamily="heading"
          color="foreground"
          textAlign="left"
          mb={1}
          position="relative"
          display="block"
        >
          {/* Render main part of title */}
          <Box as="span" position="relative" display="inline-block">
            {titleData.main}
            {/* Accent underline only under main title */}
            {showAccent && (
              <Box
                position="absolute"
                bottom="-2px"
                left="0"
                width={animationPhase === "animating" ? "100%" : "0%"}
                height="2px"
                backgroundColor="tertiary"
                borderRadius="1px"
                transition={
                  animationPhase === "reset" ? "none" : "width 0.3s ease-out"
                }
              />
            )}
          </Box>
          {/* Render secondary part without underline */}
          {titleData.secondary && (
            <Box as="span" ml={1}>
              {titleData.secondary}
            </Box>
          )}
          {children}
        </Box>
      </Box>
    );
  },
);

PageHeader.displayName = "PageHeader";

export default PageHeader;
