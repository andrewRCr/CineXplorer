import { Controller, type UseFormReturn } from "react-hook-form";
import {
  Button,
  Checkbox,
  Field,
  HStack,
  Input,
  RatingGroup,
  Switch,
  Text,
  Textarea,
} from "@chakra-ui/react";
import type { FormValues } from "./entryFormValues";

interface EntryFormFieldsProps {
  form: Pick<
    UseFormReturn<FormValues>,
    "control" | "register" | "getValues" | "setValue"
  >;
  values: FormValues;
  inert: boolean;
  today: string;
  dateValid: boolean;
  onRewatchChosen: () => void;
}
export function EntryFormFields({
  form: { control, register, getValues, setValue },
  values,
  inert,
  today,
  dateValid,
  onRewatchChosen,
}: EntryFormFieldsProps) {
  return (
    <>
      <Controller
        control={control}
        name="dateOn"
        render={({ field }) => (
          <Switch.Root
            checked={field.value}
            disabled={inert}
            onCheckedChange={({ checked }) => field.onChange(checked)}
          >
            <Switch.HiddenInput
              role="switch"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
            />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Label>Watched on</Switch.Label>
          </Switch.Root>
        )}
      />
      {values.dateOn && (
        <HStack align="start">
          <Field.Root invalid={!dateValid}>
            <Field.Label>Date watched</Field.Label>
            <Input
              type="date"
              max={today}
              disabled={inert}
              {...register("watchedOn", {
                validate: (value) =>
                  !getValues("dateOn") ||
                  (value.length === 10 && value <= today),
              })}
            />
          </Field.Root>
          <Controller
            control={control}
            name="rewatch"
            render={({ field }) => (
              <Checkbox.Root
                checked={field.value}
                disabled={inert}
                onCheckedChange={({ checked }) => {
                  onRewatchChosen();
                  field.onChange(checked === true);
                }}
              >
                <Checkbox.HiddenInput
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                />
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Label>Rewatch</Checkbox.Label>
              </Checkbox.Root>
            )}
          />
        </HStack>
      )}
      {!dateValid && (
        <Text role="alert">
          Enter a date no later than today, or turn off Watched on.
        </Text>
      )}
      <HStack>
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <RatingGroup.Root
              allowHalf
              count={5}
              value={(field.value ?? 0) / 2}
              disabled={inert}
              onValueChange={({ value }) =>
                field.onChange(value > 0 ? value * 2 : null)
              }
            >
              <RatingGroup.Label>Rating</RatingGroup.Label>
              <RatingGroup.Control />
              <RatingGroup.HiddenInput name={field.name} />
            </RatingGroup.Root>
          )}
        />
        {values.rating !== null && (
          <Button
            type="button"
            variant="ghost"
            disabled={inert}
            onClick={() => setValue("rating", null, { shouldDirty: true })}
          >
            Clear
          </Button>
        )}
      </HStack>
      <Field.Root>
        <Field.Label>Review</Field.Label>
        <Textarea
          disabled={inert}
          maxLength={10000}
          {...register("review", { maxLength: 10000 })}
        />
        {values.review.length > 9000 && (
          <Field.HelperText>{values.review.length} / 10000</Field.HelperText>
        )}
      </Field.Root>
      <Controller
        control={control}
        name="liked"
        render={({ field }) => (
          <Checkbox.Root
            checked={field.value}
            disabled={inert}
            onCheckedChange={({ checked }) => field.onChange(checked === true)}
          >
            <Checkbox.HiddenInput
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
            />
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>Liked</Checkbox.Label>
          </Checkbox.Root>
        )}
      />
    </>
  );
}
