import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Box, Button, HStack, Image, Stack, Text } from "@chakra-ui/react";
import PosterPlaceholder from "@/assets/PosterPlaceholder";
import { MoviePicker } from "@/components/movie/MoviePicker";
import { useMovieEntries } from "@/hooks/movie/useMovieEntries";
import {
  saveMutationOptions,
  useUserMovieState,
} from "@/hooks/movie/useUserMovieState";
import { movieEntriesQuery } from "@/lib/queries";
import { getChangeCount } from "@/lib/session";
import type { MoviePickerItem } from "@/types/movie";
import { EntryFormFields } from "./EntryFormFields";
import { localToday, isRewatch, type FormValues } from "./entryFormValues";
import type { EntryDialogOptions } from "@/contexts/EntryDialogContext";
import type {
  UserMovieDataPatchSchema,
  UserMovieDataSchema,
} from "@/services/userMovieDataService";

export type EntrySavedResult = {
  dateOn: boolean;
  shown: UserMovieDataSchema;
  record: UserMovieDataSchema;
  sent: UserMovieDataPatchSchema;
} & ({ kind: "create"; entryId: number } | { kind: "edit" | "save" });
export interface EntryFormProps extends EntryDialogOptions {
  owner?: number;
  onSaved: (result: EntrySavedResult) => void;
  onCancel: () => void;
  onReviewDirtyChange: (dirty: boolean) => void;
}
export function EntryForm({
  film: initialFilm,
  dateOn,
  filmChangeable,
  entry,
  owner: openingOwner,
  onSaved,
  onCancel,
  onReviewDirtyChange,
}: EntryFormProps) {
  const [owner] = useState(() => openingOwner ?? getChangeCount());
  const today = localToday();
  const [film, setFilm] = useState(initialFilm);
  const initialized = useRef<number | undefined>(undefined);
  const rewatchChosen = useRef(false);
  const log = useQuery({
    ...movieEntriesQuery(film?.tmdbId ?? 0),
    enabled: film !== undefined,
  });
  const { state } = useUserMovieState(film?.tmdbId, log.data?.record);
  const writes = useMovieEntries(film?.tmdbId ?? 0);
  const save = useMutation(saveMutationOptions(film?.tmdbId ?? 0));
  const defaults: FormValues = {
    dateOn: entry ? entry.watched_on !== null : dateOn,
    watchedOn: entry?.watched_on ?? today,
    rating: entry ? entry.rating : null,
    review: entry?.review ?? "",
    rewatch: entry?.rewatch ?? false,
    liked: false,
  };
  const {
    control,
    register,
    getValues,
    reset,
    setValue,
    handleSubmit,
    formState,
  } = useForm<FormValues>({ defaultValues: defaults, mode: "onChange" });
  const watched = useWatch({ control });
  const values: FormValues = {
    dateOn: watched.dateOn ?? defaults.dateOn,
    watchedOn: watched.watchedOn ?? defaults.watchedOn,
    rating: watched.rating ?? null,
    review: watched.review ?? defaults.review,
    rewatch: watched.rewatch ?? defaults.rewatch,
    liked: watched.liked ?? defaults.liked,
  };
  useEffect(() => {
    if (!film || !log.data || initialized.current === film.tmdbId) return;
    const current = getValues();
    reset({
      ...current,
      rating: entry ? entry.rating : state.user_rating,
      liked: state.user_liked,
      rewatch: entry
        ? entry.rewatch
        : isRewatch(log.data.entries, current.watchedOn),
    });
    initialized.current = film.tmdbId;
  }, [film, log.data, state, entry, getValues, reset]);
  useEffect(() => {
    if (!entry && !rewatchChosen.current && log.data)
      setValue("rewatch", isRewatch(log.data.entries, values.watchedOn));
  }, [entry, log.data, values.watchedOn, setValue]);
  const startingReview = entry?.review ?? "";
  useEffect(
    () => onReviewDirtyChange(values.review !== startingReview),
    [values.review, startingReview, onReviewDirtyChange],
  );
  const dateValid =
    !values.dateOn ||
    (values.watchedOn.length === 10 && values.watchedOn <= today);
  const hasReview = values.review.trim().length > 0;
  const changed = entry
    ? (values.dateOn ? values.watchedOn : null) !== entry.watched_on ||
      values.rating !== entry.rating ||
      (hasReview ? values.review : null) !== entry.review ||
      (values.dateOn && values.rewatch) !== entry.rewatch ||
      values.liked !== state.user_liked
    : values.dateOn ||
      hasReview ||
      values.rating !== state.user_rating ||
      values.liked !== state.user_liked;
  const inert =
    !film ||
    !log.data ||
    log.isPending ||
    log.isError ||
    formState.isSubmitting;
  const canSave =
    !inert &&
    dateValid &&
    changed &&
    values.review.length <= 10000 &&
    (!entry || values.dateOn || hasReview);
  const submit = handleSubmit(async (values) => {
    if (!canSave || !film || owner !== getChangeCount()) return;
    const shown = state;
    const sent: UserMovieDataPatchSchema = {
      user_liked: values.liked,
      ...(values.dateOn ? { user_watched: true } : {}),
    };
    try {
      if (!entry && !values.dateOn && !values.review.trim()) {
        sent.user_rating = values.rating;
        const record = await save.mutateAsync({
          kind: "save",
          changes: sent,
          shown,
          silent: true,
          change: owner,
        });
        if (owner === getChangeCount())
          onSaved({ kind: "save", dateOn: false, shown, record, sent });
        return;
      }
      const data = {
        watched_on: values.dateOn ? values.watchedOn : null,
        rating: values.rating,
        review: values.review.trim() ? values.review : null,
        ...(values.dateOn ? { rewatch: values.rewatch } : {}),
        liked: values.liked,
      };
      const result = entry
        ? await writes.editEntry(entry.id, data)
        : await writes.createEntry(data);
      if (owner === getChangeCount()) {
        const saved = {
          dateOn: values.dateOn,
          shown,
          record: result.record,
          sent,
        };
        if (entry) onSaved({ kind: "edit", ...saved });
        else onSaved({ kind: "create", entryId: result.entry.id, ...saved });
      }
    } catch {
      // Shared mutations own error feedback; retain the draft for retry.
    }
  });
  const choose = (film: MoviePickerItem | undefined) => {
    initialized.current = undefined;
    rewatchChosen.current = false;
    setFilm(film);
  };
  return (
    <form
      onSubmit={(event) => {
        void submit(event);
      }}
      noValidate
    >
      <Stack gap="4">
        {film ? (
          <HStack>
            {film.posterPath ? (
              <Image
                src={`https://image.tmdb.org/t/p/w92${film.posterPath}`}
                alt=""
                w="12"
              />
            ) : (
              <PosterPlaceholder aria-label="Poster unavailable" w="12" />
            )}
            <Stack gap="1">
              <Text fontWeight="semibold">{film.title}</Text>
              <Text>{film.year ?? "Year unknown"}</Text>
            </Stack>
            {filmChangeable && !entry && (
              <Button
                type="button"
                variant="ghost"
                disabled={formState.isSubmitting}
                onClick={() => choose(undefined)}
              >
                Change
              </Button>
            )}
          </HStack>
        ) : (
          <MoviePicker disabled={formState.isSubmitting} onSelect={choose} />
        )}
        {film && log.isPending && (
          <Text role="status">Loading this film's log…</Text>
        )}
        {film && log.isError && (
          <Box role="alert">
            <Text>Couldn't load this film's log.</Text>
            <Button type="button" onClick={() => void log.refetch()}>
              Retry
            </Button>
          </Box>
        )}
        <EntryFormFields
          form={{ control, register, getValues, setValue }}
          values={values}
          inert={inert}
          today={today}
          dateValid={dateValid}
          onRewatchChosen={() => {
            rewatchChosen.current = true;
          }}
        />
        {entry && !values.dateOn && !hasReview && (
          <Text role="alert">An entry needs a date or a review.</Text>
        )}
        <HStack justify="end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canSave}
            loading={formState.isSubmitting}
            loadingText="Saving…"
          >
            Save
          </Button>
        </HStack>
      </Stack>
    </form>
  );
}
