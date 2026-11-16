import type { ActivityPage } from "@/services/userMovieDataService";
import { RecentlyWatched } from "./RecentlyWatched";
import type { MovieListResponse } from "@/types/movie";
import { useEffect, useState } from "react";
import { Container, Heading, Text, VisuallyHidden } from "@chakra-ui/react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import useAuthContext from "@/hooks/auth/useAuthContext";
import { homeWatchlistQuery, homeActivityQuery } from "@/lib/queries";
import LoadingContent from "@/components/layout/LoadingContent";
import { pageContainerProps } from "@/components/layout/pageContainer";
import type { AuthStateProps } from "@/types/auth-state";
import { WatchlistSection } from "./WatchlistSection";
import { WhatsOn } from "./WhatsOn";

type HomeSet = "visitor" | "nothing-saved";
let greetedAt: number | undefined;

function SettledHome({
  user,
  set,
  generation,
  watchlist,
  activity,
}: {
  user: NonNullable<AuthStateProps["user"]>;
  set: HomeSet;
  generation: number;
  watchlist: UseQueryResult<MovieListResponse>;
  activity: UseQueryResult<ActivityPage>;
}) {
  const [greet] = useState(() => greetedAt !== generation);
  useEffect(() => {
    greetedAt = generation;
  }, [generation]);
  const name = user.first_name || user.username;
  return (
    <Container {...pageContainerProps}>
      {greet ? (
        <Heading as="h1" size="2xl" pt={8} mb={4}>
          {set === "nothing-saved" ? "Welcome" : "Welcome back"}, {name}
        </Heading>
      ) : (
        <VisuallyHidden as="h1">Home</VisuallyHidden>
      )}
      {set === "nothing-saved" ? (
        <Text mt={greet ? 0 : 8} mb={4}>
          Films you add to your watchlist will show up here.
        </Text>
      ) : (
        <WatchlistSection result={watchlist} />
      )}
      <RecentlyWatched result={activity} />
      <WhatsOn />
    </Container>
  );
}

/** Choose the page once its first reads settle; later retries belong to their section. */
export function SignedInHome({ generation }: { generation: number }) {
  const user = useAuthContext()?.user;
  const watchlist = useQuery(homeWatchlistQuery());
  const activity = useQuery(homeActivityQuery());
  const [set, chooseSet] = useState<HomeSet | null>(null);
  if (set === null) {
    if (
      user &&
      !watchlist.isPending &&
      !watchlist.isFetching &&
      !activity.isPending &&
      !activity.isFetching
    )
      chooseSet(
        watchlist.isError ||
          activity.isError ||
          (watchlist.data?.results?.length ?? 0) > 0 ||
          (activity.data?.results.length ?? 0) > 0
          ? "visitor"
          : "nothing-saved",
      );
    return <LoadingContent mode="content" />;
  }
  if (!user) return <LoadingContent mode="content" />;
  return (
    <SettledHome
      user={user}
      set={set}
      generation={generation}
      activity={activity}
      watchlist={watchlist}
    />
  );
}
