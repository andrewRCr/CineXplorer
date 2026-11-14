import { Box, Text, VStack, HStack } from "@chakra-ui/react";
import MovieUserScore from "@/components/movie/MovieUserScore";
import { RatingStars } from "@/components/movie/RatingStars";

/**
 * CineXplorer Extensions Section - App-Specific Tokens
 *
 * Shows movie-app-specific tokens (ratings, badges, drag-and-drop).
 */
export function CineXplorerExtensionsSection() {
  return (
    <Box
      id="cinexplorer-extensions"
      bg="layer-01"
      p={6}
      borderRadius="md"
      borderWidth="1px"
      borderColor="border-strong-01"
    >
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        CineXplorer Extensions
      </Text>
      <Box
        bg="background"
        p={4}
        borderRadius="md"
        borderWidth="1px"
        borderColor="border-subtle-00"
      >
        <VStack align="stretch" gap={4}>
          {/* TMDB community score chips */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2} textAlign="center">
              TMDB Community Scores (0-10)
            </Text>
            <HStack gap={2} wrap="wrap" justify="center">
              <MovieUserScore score={8.2} voteCount={1500} />
              <MovieUserScore score={6.5} voteCount={1500} />
              <MovieUserScore score={4.1} voteCount={1500} />
              <MovieUserScore score={6.2} voteCount={4} />
            </HStack>
            <Text fontSize="xs" color="foreground/60" mt={1} textAlign="center">
              10+ votes: outlined chip, neutral number; dot is success at ≥7.5,
              foreground at 5.0–7.4, destructive below 5.0, using the displayed
              value. Fewer votes: filled neutral chip, no dot.
            </Text>
          </Box>

          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2} textAlign="center">
              User Personal Ratings
            </Text>
            <HStack gap={4} justify="center" align="end">
              <RatingStars rating={1} />
              <RatingStars rating={7} />
              <RatingStars rating={8} size="lg" />
              <RatingStars rating={10} size="lg" />
            </HStack>
            <Text fontSize="xs" color="foreground/60" mt={1} textAlign="center">
              Half a star per rating point: 0.5, 3.5, 4 and 5 earned stars.
              Small and large stars use the active theme's imdb-gold.
            </Text>
          </Box>

          {/* Badge Token */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2} textAlign="center">
              Genre Badges
            </Text>
            <HStack gap={2} justify="center">
              <Box
                bg="badge"
                color="on-badge"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
              >
                Action
              </Box>
              <Box
                bg="badge"
                color="on-badge"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
              >
                Sci-Fi
              </Box>
            </HStack>
            <Text fontSize="xs" color="foreground/60" mt={1} textAlign="center">
              Neutral labels for genres, tags
            </Text>
          </Box>

          {/* Drag and Drop Tokens */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={2} textAlign="center">
              Drag & Drop States
            </Text>
            <HStack gap={2} justify="center">
              <Box
                bg="drag-active"
                p={2}
                px={3}
                borderRadius="md"
                borderWidth="2px"
                borderColor="info"
                borderStyle="dashed"
                boxShadow="shadow-sm"
              >
                <Text fontSize="xs" fontWeight="medium" color="on-secondary">
                  drag-active
                </Text>
              </Box>
              <Box
                bg="drop-zone"
                p={2}
                px={3}
                borderRadius="md"
                borderWidth="2px"
                borderColor="success"
                borderStyle="dashed"
              >
                <Text fontSize="xs" fontWeight="medium" color="foreground">
                  drop-zone
                </Text>
              </Box>
            </HStack>
            <Text fontSize="xs" color="foreground/60" mt={2} textAlign="center">
              drag-active: secondaryHover bg, on-secondary text, info dashed
              border | drop-zone: muted bg, foreground text, success dashed
              border
            </Text>
          </Box>
        </VStack>
      </Box>
      <Text
        fontSize="xs"
        color="foreground/70"
        fontStyle="italic"
        px={2}
        mt={3}
        textAlign="center"
      >
        Scores use outlined dot chips with neutral numbers; only the dot carries
        tier color. Few-vote scores and certifications use the filled neutral
        badge pair. Star icons use the theme's gold.
      </Text>
    </Box>
  );
}
