import { useMemo, useState } from "react";
import { Combobox, Image, Text, createListCollection } from "@chakra-ui/react";
import { LuCheck } from "react-icons/lu";
import PosterPlaceholder from "@/assets/PosterPlaceholder";
import { useMoviePickerItems } from "@/hooks/movie/useMoviePickerItems";
import type { MoviePickerItem } from "@/types/movie";

export function MoviePicker({
  onSelect,
  disabled,
}: {
  onSelect: (film: MoviePickerItem) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string[]>([]);
  const { items, isSearching, isError } = useMoviePickerItems(text);
  const collection = useMemo(
    () =>
      createListCollection({
        items,
        itemToString: (item) => item.title,
        itemToValue: (item) => String(item.tmdbId),
      }),
    [items],
  );
  const message = isSearching
    ? "Searching…"
    : isError
      ? "Search failed. Keep typing to try again."
      : items.length === 0
        ? `No films match "${text.trim()}".`
        : undefined;
  return (
    <Combobox.Root
      collection={collection}
      disabled={disabled}
      loading={isSearching}
      inputValue={text}
      value={value}
      open={open && text.trim().length >= 2}
      openOnClick
      onOpenChange={({ open }) => setOpen(open)}
      onInputValueChange={({ inputValue }) => setText(inputValue)}
      onValueChange={({ value, items }) => {
        setValue(value);
        if (items[0]) onSelect(items[0]);
      }}
    >
      <Combobox.Label>Film</Combobox.Label>
      <Combobox.Control>
        <Combobox.Input />
      </Combobox.Control>
      <Combobox.Positioner>
        <Combobox.Content>
          {message &&
            (items.length === 0 ? (
              <Combobox.Empty>
                <Text role="status">{message}</Text>
              </Combobox.Empty>
            ) : (
              <Text role="status" px="3" py="2">
                {message}
              </Text>
            ))}
          {collection.items.map((item) => (
            <Combobox.Item
              key={item.tmdbId}
              item={item}
              aria-label={`${item.title} ${item.year ?? "Year unknown"}`}
            >
              {item.posterPath ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
                  alt=""
                  w="8"
                  h="12"
                  objectFit="cover"
                />
              ) : (
                <PosterPlaceholder
                  aria-label="Poster unavailable"
                  w="8"
                  h="12"
                />
              )}
              <Combobox.ItemText>
                {item.title}{" "}
                <Text as="span">{item.year ?? "Year unknown"}</Text>
              </Combobox.ItemText>
              <Combobox.ItemIndicator>
                <LuCheck role="img" aria-label="Selected" />
              </Combobox.ItemIndicator>
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
}
