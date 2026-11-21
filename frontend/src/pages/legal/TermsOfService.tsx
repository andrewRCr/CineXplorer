import { Link, List, Text } from "@chakra-ui/react";
import { TextLink } from "@/components/common";
import { ROUTES } from "@/constants/routes";
import { LegalDocument, LegalHeading } from "./LegalDocument";

export default function TermsOfService() {
  return (
    <LegalDocument
      title="CineXplorer Terms of Service"
      effectiveDate="November 20, 2026"
    >
      <Text>
        These terms cover your use of CineXplorer, a free movie-discovery
        website run as a personal project by Andrew Creekmore ("we", "us"). By
        using the site you agree to them. The{" "}
        <TextLink to={ROUTES.PRIVACY}>Privacy Policy</TextLink> explains how we
        handle your data. If you don't agree, please don't use the site.
      </Text>
      <LegalHeading as="h2">1. The service</LegalHeading>
      <Text>
        CineXplorer lets you browse and search movies and, with an account, keep
        a watchlist and a record of the films you watch, rate and review. It's
        free and has no paid features.
      </Text>
      <LegalHeading as="h2">2. Who can use it</LegalHeading>
      <Text>
        You must be at least 13 years old, or older where your country's law
        requires it, to create an account.
      </Text>
      <LegalHeading as="h2">3. Your account</LegalHeading>
      <List.Root ps={6} gap={2}>
        <List.Item>
          Give accurate information, and keep your password to yourself. You're
          responsible for what happens under your account.
        </List.Item>
        <List.Item>An account is for one person.</List.Item>
        <List.Item>
          If you sign in with Google or GitHub, their terms also apply to that
          sign-in.
        </List.Item>
        <List.Item>
          Tell us at{" "}
          <Link
            href="mailto:cinexplorer@andrewcreekmore.dev"
            variant="underline"
          >
            cinexplorer@andrewcreekmore.dev
          </Link>{" "}
          if you think someone else has used your account.
        </List.Item>
      </List.Root>
      <LegalHeading as="h2">4. Using the site fairly</LegalHeading>
      <Text>Please don't:</Text>
      <List.Root ps={6} gap={2}>
        <List.Item>break the law, or use the site to harm anyone;</List.Item>
        <List.Item>
          try to get into accounts, systems or data that aren't yours, or probe,
          scan or test the site's security without our written permission;
        </List.Item>
        <List.Item>
          interfere with the site, overload it, or get around its rate limits;
        </List.Item>
        <List.Item>
          scrape or bulk-download content, or reach the site through bots or
          automated tools beyond ordinary browsing;
        </List.Item>
        <List.Item>
          copy the site's film information or images to use elsewhere, outside
          what TMDB's own terms allow (see section 6);
        </List.Item>
        <List.Item>pretend to be someone else.</List.Item>
      </List.Root>
      <LegalHeading as="h2">5. What you add</LegalHeading>
      <Text>
        What you add, such as your lists, ratings and reviews, stays yours. You
        let us store it and show it back to you so the site can work. Access to
        your lists, ratings and reviews in the app is limited to your account.
        The Privacy Policy explains what the site operator can see in the admin
        area.
      </Text>
      <LegalHeading as="h2">6. Film information and images</LegalHeading>
      <Text>
        Film information and images come from The Movie Database (TMDB). This
        product uses the TMDB API but is not endorsed or certified by TMDB.
        TMDB's terms govern their content, and posters and other images belong
        to their owners. We can't promise the film information is complete or
        correct.
      </Text>
      <LegalHeading as="h2">7. Availability</LegalHeading>
      <Text>
        CineXplorer is a personal project. We may change, pause or stop it, or
        any part of it, at any time. Before shutting it down for good, we'll try
        to give notice by email, so you can ask for a copy of your data first.
        We back up the site's data, but we can't promise nothing will ever be
        lost.
      </Text>
      <LegalHeading as="h2">8. No warranties</LegalHeading>
      <Text>
        The site is provided "as is" and "as available", without warranties of
        any kind, express or implied, including fitness for a particular purpose
        and non-infringement, to the fullest extent the law allows.
      </Text>
      <LegalHeading as="h2">9. Limitation of liability</LegalHeading>
      <Text>
        To the fullest extent the law allows, we aren't liable for indirect,
        incidental, special or consequential damages, or for lost data or
        profits, arising from your use of the site. Because the site is free,
        our total liability for any claim about it is limited to US $50.
      </Text>
      <LegalHeading as="h2">10. Ending your use</LegalHeading>
      <Text>
        You can stop using CineXplorer at any time and ask us to delete your
        account, as the Privacy Policy describes. We may suspend or delete an
        account that breaks these terms or puts the site or other people at
        risk.
      </Text>
      <LegalHeading as="h2">11. Changes to these terms</LegalHeading>
      <Text>
        We'll post any change here with a new effective date. If you keep using
        the site after a change takes effect, you accept the updated terms.
      </Text>
      <LegalHeading as="h2">12. Governing law</LegalHeading>
      <Text>
        These terms are governed by the laws of the State of Arkansas, United
        States, and any dispute about them belongs in the courts there, unless
        the law where you live gives you a right to bring it elsewhere.
      </Text>
      <LegalHeading as="h2">13. Contact</LegalHeading>
      <Text>
        Andrew Creekmore,{" "}
        <Link href="mailto:cinexplorer@andrewcreekmore.dev" variant="underline">
          cinexplorer@andrewcreekmore.dev
        </Link>
      </Text>
    </LegalDocument>
  );
}
