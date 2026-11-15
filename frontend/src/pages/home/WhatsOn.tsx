import { PosterRowSection } from "@/components/movie/sections/PosterRowSection";
import { ReleaseCalendar } from "@/components/movie/sections/ReleaseCalendar";
import { homeWindowQuery } from "@/lib/queries";
import { catalogTitle } from "@/utilities/catalogTitle";
import { DEFAULT_BROWSE_PARAMS } from "@/constants/browseDefaults";

export function WhatsOn() {
  return (
    <>
      <PosterRowSection
        title={catalogTitle("now-playing", DEFAULT_BROWSE_PARAMS)}
        seeAll="/browse/now-playing"
        query={homeWindowQuery("now-playing")}
      />
      <ReleaseCalendar
        title={catalogTitle("upcoming", DEFAULT_BROWSE_PARAMS)}
        seeAll="/browse/upcoming"
        query={homeWindowQuery("upcoming")}
      />
    </>
  );
}
