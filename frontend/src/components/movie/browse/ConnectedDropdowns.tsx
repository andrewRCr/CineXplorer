import {
  Box,
  HStack,
  Select,
  createListCollection,
  Button,
} from "@chakra-ui/react";
import { memo, useMemo, useCallback } from "react";
import { FiFilter } from "react-icons/fi";
import {
  coreGenreOptions,
  genreOptions,
  yearOptions,
} from "@/constants/browseOptions";
import type { BrowseParams } from "@/types/browseTypes";
import { analyzeYearFilter } from "@/utilities/yearFilterAnalysis";
import {
  BROWSE_SELECT_TRIGGER_BASE_PROPS,
  BROWSE_SELECT_TRIGGER_CSS,
} from "./selectStyles";

const GENRE_WIDTH = "140px";
const YEAR_WIDTH = "110px";
const YEAR_SPAN_WIDTH = YEAR_WIDTH + "10px";

const getFilterValueTextProps = (isDisabled: boolean, isActive: boolean) => ({
  fontStyle: isDisabled ? "italic" : "normal",
  transition: "color 0.15s ease-out 0.05s",
  color: isDisabled ? "on-muted" : isActive ? "primary" : "foreground",
});

interface ConnectedDropdownsProps {
  filters: BrowseParams;
  onFiltersChange: (
    filters: Partial<BrowseParams> | ((prev: BrowseParams) => BrowseParams),
  ) => void;
  onToggleAdvanced?: () => void;
  isAdvancedOpen?: boolean;
  /** Whether advanced filters are currently applied (for toggle button indicator) */
  hasActiveAdvancedFilters?: boolean;
  pageSource?: string;
}

const ConnectedDropdowns = ({
  filters,
  onFiltersChange,
  onToggleAdvanced,
  isAdvancedOpen = false,
  hasActiveAdvancedFilters = false,
  pageSource,
}: ConnectedDropdownsProps) => {
  // Memoize the filter update function to prevent recreation
  const updateFilter = useCallback(
    <K extends keyof BrowseParams>(key: K, value: BrowseParams[K]) => {
      onFiltersChange((prevFilters) => {
        const newFilters = { ...prevFilters, [key]: value };
        return newFilters;
      });
    },
    [onFiltersChange],
  );

  // Memoize expensive genre display calculations
  const genreDisplayData = useMemo(() => {
    const isMultipleGenres = filters.genres.length > 1;
    const selectedGenreId =
      filters.genres.length === 1 ? filters.genres[0] : null;
    const isAdvancedGenre =
      selectedGenreId !== null &&
      !coreGenreOptions.some(
        (g) => String(g.value) === String(selectedGenreId),
      );

    let genreDisplay = null;
    if (isMultipleGenres) {
      genreDisplay = { value: "multiple", label: "Multiple" };
    } else if (isAdvancedGenre) {
      const genre = genreOptions.find(
        (g) => String(g.value) === String(selectedGenreId),
      );
      genreDisplay = {
        value: String(selectedGenreId),
        label: genre ? genre.label : "Custom",
      };
    }

    return {
      isMultipleGenres,
      selectedGenreId,
      isAdvancedGenre,
      genreDisplay,
      isGenreDisabled: isMultipleGenres || isAdvancedGenre,
    };
  }, [filters.genres]);

  // Memoize year display calculations
  const yearDisplayData = useMemo(() => {
    // Check if year filter should be disabled due to route constraints (now-playing/upcoming)
    const isRouteConstrained =
      pageSource === "now-playing" || pageSource === "upcoming";

    // Use shared utility for year filter analysis
    const yearAnalysis = analyzeYearFilter(filters.minYear, filters.maxYear);

    // Determine if this should show as "Custom" (disabled, italic)
    // Route-constrained pages override this with their own display
    const isYearCustom =
      !yearAnalysis.isEmpty &&
      !yearAnalysis.isInPresets &&
      !yearAnalysis.isSameYear;

    let yearDisplayValue: string;
    let isYearSpan = false;

    if (isRouteConstrained) {
      // Route-specific display: show the actual date range years for now-playing/upcoming
      const today = new Date();
      let startDate: Date;
      let endDate: Date;

      if (pageSource === "now-playing") {
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        endDate = new Date(today);
        endDate.setDate(today.getDate() + 5);
      } else {
        startDate = new Date(today);
        startDate.setDate(today.getDate() + 5);
        endDate = new Date(today);
        endDate.setDate(today.getDate() + 65);
      }

      const startYear = startDate.getFullYear().toString();
      const endYear = endDate.getFullYear().toString();
      isYearSpan = startYear !== endYear;
      yearDisplayValue = isYearSpan ? `${startYear}-${endYear}` : startYear;
    } else {
      // Use analysis display value for non-route-constrained pages
      yearDisplayValue = yearAnalysis.displayValue;
    }

    return {
      isDecadeRange: yearAnalysis.isDecadeRange,
      isYearCustom,
      yearDisplayValue,
      yearDisplayLabel: isRouteConstrained
        ? yearDisplayValue
        : yearAnalysis.displayLabel,
      isRouteConstrained,
      isYearSpan,
    };
  }, [filters.minYear, filters.maxYear, pageSource]);

  // Conditional width for year dropdown - wider when showing year span (e.g., "2024-2025")
  const yearWidth = yearDisplayData.isYearSpan ? YEAR_SPAN_WIDTH : YEAR_WIDTH;

  // Active filter visual indication - show primary color when filter has non-default value
  // Disabled filters (multiple/advanced/route-constrained) keep their muted style
  const hasActiveGenre =
    filters.genres.length > 0 && !genreDisplayData.isGenreDisabled;
  const hasActiveYear =
    (filters.minYear !== "" || filters.maxYear !== "") &&
    !yearDisplayData.isYearCustom &&
    !yearDisplayData.isRouteConstrained;

  // Memoize collections to prevent array recreation on every render
  const genreCollection = useMemo(
    () =>
      createListCollection({
        items: [
          ...(genreDisplayData.genreDisplay &&
          genreDisplayData.genreDisplay.value !== "multiple"
            ? [
                {
                  label: genreDisplayData.genreDisplay.label,
                  value: genreDisplayData.genreDisplay.value,
                },
              ]
            : []),
          ...(genreDisplayData.isMultipleGenres
            ? [{ label: "Multiple", value: "multiple" }]
            : []),
          ...coreGenreOptions.map((option) => ({
            label: option.label,
            value: String(option.value),
          })),
        ],
      }),
    [genreDisplayData],
  );

  const yearCollection = useMemo(() => {
    const allItems = [
      ...(yearDisplayData.isRouteConstrained
        ? [
            {
              label: yearDisplayData.yearDisplayValue,
              value: yearDisplayData.yearDisplayValue,
            },
          ]
        : []),
      ...(yearDisplayData.isYearCustom
        ? [{ label: yearDisplayData.yearDisplayLabel, value: "custom" }]
        : []),
      ...yearOptions.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    ];

    // Deduplicate by value to prevent React key conflicts
    // (e.g., now-playing in 2025 adds "2025" but yearOptions also includes it)
    const seen = new Set<string>();
    const uniqueItems = allItems.filter((item) => {
      if (seen.has(item.value)) return false;
      seen.add(item.value);
      return true;
    });

    return createListCollection({ items: uniqueItems });
  }, [
    yearDisplayData.isYearCustom,
    yearDisplayData.isRouteConstrained,
    yearDisplayData.yearDisplayValue,
    yearDisplayData.yearDisplayLabel,
  ]);

  return (
    <HStack gap={0} align="stretch">
      {/* Genre dropdown */}
      <Box position="relative">
        <Select.Root
          collection={genreCollection}
          value={
            genreDisplayData.genreDisplay
              ? [genreDisplayData.genreDisplay.value]
              : filters.genres.length > 0
                ? filters.genres.map(String)
                : [""]
          }
          onValueChange={(details) => {
            const value = details.value[0];
            updateFilter("genres", value ? [parseInt(value, 10)] : []);
          }}
          disabled={genreDisplayData.isGenreDisabled}
          positioning={{ placement: "bottom-start", gutter: 2 }}
        >
          <Select.Trigger
            w={GENRE_WIDTH}
            {...BROWSE_SELECT_TRIGGER_BASE_PROPS}
            borderRadius="4px 0 0 4px"
            // DESIGN: Uses button-outline (not input) for visual consistency with adjacent toggle button
            _disabled={{
              opacity: 1,
              cursor: "not-allowed",
            }}
            css={BROWSE_SELECT_TRIGGER_CSS}
          >
            <Select.ValueText
              placeholder="Any Genre"
              {...getFilterValueTextProps(
                genreDisplayData.isGenreDisabled,
                hasActiveGenre,
              )}
            />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Positioner>
            <Select.Content w={GENRE_WIDTH}>
              {genreCollection.items.map((item) => (
                <Select.Item key={item.value} item={item}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
      </Box>

      {/* Year dropdown */}
      <Box position="relative">
        <Select.Root
          collection={yearCollection}
          value={[yearDisplayData.yearDisplayValue]}
          onValueChange={(details) => {
            const value = details.value[0] ?? "";
            if (value.endsWith("'s")) {
              const startYear = parseInt(value.slice(0, 4));
              const endYear = startYear + 9;
              onFiltersChange((prev) => ({
                ...prev,
                minYear: startYear.toString(),
                maxYear: endYear.toString(),
              }));
            } else if (value) {
              onFiltersChange((prev) => ({
                ...prev,
                minYear: value,
                maxYear: value,
              }));
            } else {
              onFiltersChange((prev) => ({
                ...prev,
                minYear: "",
                maxYear: "",
              }));
            }
          }}
          disabled={
            yearDisplayData.isYearCustom || yearDisplayData.isRouteConstrained
          }
          positioning={{ placement: "bottom-start", gutter: 2 }}
        >
          <Select.Trigger
            w={yearWidth}
            {...BROWSE_SELECT_TRIGGER_BASE_PROPS}
            borderRadius="0"
            // DESIGN: Uses button-outline (not input) for visual consistency with adjacent toggle button
            _disabled={{
              opacity: 1,
              cursor: "not-allowed",
            }}
            css={BROWSE_SELECT_TRIGGER_CSS}
          >
            <Select.ValueText
              placeholder="Year"
              {...getFilterValueTextProps(
                yearDisplayData.isYearCustom ||
                  yearDisplayData.isRouteConstrained,
                hasActiveYear,
              )}
            />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Positioner>
            <Select.Content w={yearWidth}>
              {yearCollection.items.map((item) => (
                <Select.Item key={item.value} item={item}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
      </Box>

      {/* Advanced filters toggle
          NOTE: This button is visually connected to the genre/year dropdowns (forms one continuous control group).
          Unlike standalone buttons, it uses subtle hover styling (background tint only) to match the connected
          dropdowns' hover behavior. This creates visual cohesion across the connected control group.
          Strategy doc pattern (border/text color changes on hover) applies to standalone buttons, not connected groups.
          Active filter indication: primary icon color when panel is open OR when advanced filters are applied.
      */}
      {onToggleAdvanced && (
        <Button
          onClick={onToggleAdvanced}
          size="sm"
          variant="outline"
          borderRadius="0 4px 4px 0"
          borderColor="button-outline"
          // Active filter indication: primary color when panel is open or advanced filters applied
          color={
            isAdvancedOpen || hasActiveAdvancedFilters
              ? "primary"
              : "on-button-outline"
          }
          _hover={{
            bg: "tertiary/8",
          }}
          _focusVisible={{
            borderColor: "tertiary",
            outline: "none",
          }}
          minW="auto"
          px={3}
          height="32px"
        >
          <FiFilter size={14} />
        </Button>
      )}
    </HStack>
  );
};

// Memoize the component to prevent unnecessary re-renders
const MemoizedConnectedDropdowns = memo(
  ConnectedDropdowns,
  (prevProps, nextProps) => {
    // Custom comparison function for optimal performance
    return (
      // Compare filter values that actually affect this component
      prevProps.filters.genres.length === nextProps.filters.genres.length &&
      prevProps.filters.genres.every(
        (genre, index) => genre === nextProps.filters.genres[index],
      ) &&
      prevProps.filters.minYear === nextProps.filters.minYear &&
      prevProps.filters.maxYear === nextProps.filters.maxYear &&
      // Compare function references
      prevProps.onFiltersChange === nextProps.onFiltersChange &&
      prevProps.onToggleAdvanced === nextProps.onToggleAdvanced &&
      // Compare state for active filter indication
      prevProps.isAdvancedOpen === nextProps.isAdvancedOpen &&
      prevProps.hasActiveAdvancedFilters ===
        nextProps.hasActiveAdvancedFilters &&
      // Compare pageSource for route-based disabling
      prevProps.pageSource === nextProps.pageSource
    );
  },
);

MemoizedConnectedDropdowns.displayName = "ConnectedDropdowns";

export default MemoizedConnectedDropdowns;
