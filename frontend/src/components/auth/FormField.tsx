import { Box, Field } from "@chakra-ui/react";
import { StyledInput } from "@/components/common";
import type { ReactNode, ChangeEvent, FocusEvent } from "react";

/**
 * FormField
 *
 * Reusable form field with consistent styling for authentication forms.
 * Wraps Field.Root, Field.Label, StyledInput, and Field.ErrorText with
 * the standard layout pattern (fixed height container, absolute error positioning).
 *
 * @example
 * ```tsx
 * <FormField
 *   name="email"
 *   label="Email Address"
 *   type="email"
 *   value={formik.values.email}
 *   error={formik.errors.email}
 *   touched={formik.touched.email}
 *   onChange={(e) => {
 *     formik.handleChange(e);
 *     setError(""); // Clear error on typing
 *   }}
 *   onBlur={formik.handleBlur}
 *   autoFocus
 * />
 *
 * // With helper content (e.g., forgot password link)
 * <FormField
 *   name="password"
 *   label="Password"
 *   type="password"
 *   value={formik.values.password}
 *   error={formik.errors.password}
 *   touched={formik.touched.password}
 *   onChange={formik.handleChange}
 *   onBlur={formik.handleBlur}
 *   mt={3}
 * >
 *   <TextLink to="/forgot-password">Forgot password?</TextLink>
 * </FormField>
 * ```
 */

interface FormFieldProps {
  /** Field name - used for id, name, and htmlFor attributes */
  name: string;
  /** Label text displayed above the input */
  label: string;
  /** Input type - defaults to "text" */
  type?: "text" | "email" | "password";
  /** Current field value */
  value: string;
  /** Validation error message (displayed when touched) */
  error?: string;
  /** Whether the field has been touched/blurred */
  touched?: boolean;
  /** Change handler */
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Blur handler */
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  /** Whether to auto-focus this field */
  autoFocus?: boolean;
  /** Whether the field is required - defaults to true */
  required?: boolean;
  /** Top margin for spacing between fields */
  mt?: number | string;
  /** Minimum height for the field container - defaults to "80px" */
  minH?: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** HTML autocomplete attribute */
  autoComplete?: string;
  /** Maximum character length */
  maxLength?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Optional helper content rendered below the field (e.g., "Forgot password?" link) */
  children?: ReactNode;
}

export const FormField = ({
  name,
  label,
  type = "text",
  value,
  error,
  touched,
  onChange,
  onBlur,
  autoFocus,
  required = true,
  mt,
  minH = "80px",
  placeholder,
  autoComplete,
  maxLength,
  disabled,
  children,
}: FormFieldProps) => {
  const isInvalid = !!error && touched;

  return (
    <Box minH={minH} w="100%" mt={mt}>
      <Field.Root
        required={required}
        invalid={isInvalid}
        w="100%"
        position="relative"
      >
        <Field.Label
          htmlFor={name}
          fontSize="16px"
          fontWeight="medium"
          mb={2}
        >
          {label}
        </Field.Label>
        <StyledInput
          autoFocus={autoFocus}
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          disabled={disabled}
          layer="01"
        />
        <Field.ErrorText
          fontSize="14px"
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt="4px"
          color="destructive"
        >
          {error}
        </Field.ErrorText>
      </Field.Root>
      {children && (
        <Box w="100%" textAlign="right" mt={1}>
          {children}
        </Box>
      )}
    </Box>
  );
};
