import { Code, Link, List, Table, Text } from "@chakra-ui/react";
import { TextLink } from "@/components/common";
import { LegalDocument, LegalHeading, LegalTableRegion } from "./LegalDocument";

export default function PrivacyPolicy() {
  return (
    <LegalDocument
      title="CineXplorer Privacy Policy"
      effectiveDate="November 22, 2026"
    >
      <Text>
        CineXplorer is a free movie-discovery website run as a personal project
        by Andrew Creekmore. This policy explains what the site collects, why,
        who else handles it, how long it's kept, and what you can ask for.
        Questions or requests:{" "}
        <Link href="mailto:cinexplorer@andrewcreekmore.dev" variant="underline">
          cinexplorer@andrewcreekmore.dev
        </Link>
        .
      </Text>
      <LegalHeading as="h2">The short version</LegalHeading>
      <List.Root ps={6} gap={2}>
        <List.Item>
          You can browse movies without an account. An account lets you keep a
          watchlist and a record of the films you watch, rate and review.
        </List.Item>
        <List.Item>
          We collect what's needed to run accounts and keep the site working,
          and nothing for advertising. There are no ads, no analytics or
          tracking scripts, and we don't sell or rent anyone's data.
        </List.Item>
        <List.Item>
          If you sign in with Google or GitHub, we receive the name, email
          address and basic profile the provider sends us. We read the first
          page of email addresses GitHub returns and keep your primary, verified
          address if it appears there.
        </List.Item>
      </List.Root>
      <LegalHeading as="h2">What we collect</LegalHeading>
      <LegalHeading as="h3">Your account</LegalHeading>
      <Text>
        If you sign up with an email address, we store your email address, the
        username you choose, and your password as a one-way hash (never in
        readable form). We also record whether you've verified your email
        address, when you joined, and a timestamp that updates when we save your
        full account record.
      </Text>
      <LegalHeading as="h3">Signing in with Google</LegalHeading>
      <Text>
        When you sign in with Google, Google asks you to share your basic
        profile and email address with CineXplorer. That's all the site
        requests: it can't see your Gmail, Drive, contacts, calendar or anything
        else in your Google account.
      </Text>
      <List.Root ps={6} gap={2}>
        <List.Item>
          <strong>What we receive:</strong> your Google account ID, your email
          address and its verification status if Google sends an address, your
          name (full, given and family), a link to your profile picture, and
          your language setting if Google includes it, along with technical
          details of the sign-in itself.
        </List.Item>
        <List.Item>
          <strong>How we use it:</strong> to create your CineXplorer account or
          sign you in to it, to fill in your email address and name and make
          your username from them, and to recognize you the next time you sign
          in with Google. If your Google email address is verified by Google and
          matches an existing CineXplorer account, Google sign-in is linked to
          that account. If that account's email address had never been verified,
          its password is removed. You can sign in with Google or reset your
          password using that email address. GitHub sign-in can also link to the
          account if GitHub returns the same address as your verified primary
          address.
        </List.Item>
        <List.Item>
          <strong>How we store it:</strong> in the site's database on our
          server, together with a copy of the profile Google sent, which is
          updated each time you sign in, and when you first and last signed in
          with Google. We don't keep Google's access or refresh tokens with your
          account. If Google sends no email address for a new account, we keep
          the pending sign-in in your browser's session on our server, including
          the profile Google sent, its access token and any refresh token it
          sends. In the existing-account case described under Email, the server
          can store the unverified address in that session as part of a pending
          verification step, even when we skip sending the notice. The session
          rules under "How long we keep things" explain when these details are
          cleared.
        </List.Item>
        <List.Item>
          <strong>Sharing:</strong> we don't sell Google user data or use it for
          advertising, and we share it only with the providers that run the
          site: it's stored with the rest of the database at our hosting and
          backup providers. When we email you, our email provider receives your
          address and the message, which may include your CineXplorer username
          (see{" "}
          <TextLink to="#who-else-handles-your-data">
            Who else handles your data
          </TextLink>
          ).
        </List.Item>
        <List.Item>
          <strong>Protection:</strong> see{" "}
          <TextLink to="#security">Security</TextLink>.
        </List.Item>
        <List.Item>
          <strong>Keeping and deleting it:</strong> we keep your linked Google
          profile while you have an account and delete it with your account.
          Your session can retain your Google account ID after account deletion.
          Admin activity records can retain your email address and your
          CineXplorer username, including one made from your Google name or
          email address (see{" "}
          <TextLink to="#your-choices">Your choices</TextLink>). You can also
          remove CineXplorer from the linked apps in your Google Account, under
          Sign in with Google. If you remove the link at Google, you can still
          sign in to the same CineXplorer account the next time you choose Sign
          in with Google.
        </List.Item>
      </List.Root>
      <Text>
        CineXplorer's use of information received from Google APIs adheres to
        the{" "}
        <Link
          href="https://developers.google.com/terms/api-services-user-data-policy"
          variant="underline"
        >
          Google API Services User Data Policy
        </Link>
        .
      </Text>
      <LegalHeading as="h3">Signing in with GitHub</LegalHeading>
      <Text>
        When you sign in with GitHub, GitHub asks you to share your public
        profile and your email addresses.
      </Text>
      <List.Root ps={6} gap={2}>
        <List.Item>
          <strong>What we receive:</strong> your GitHub user ID and username,
          your name and avatar link, the other public profile details GitHub
          includes (such as bio, location, company and website), and the first
          page of email addresses GitHub returns, with whether each is primary
          and verified.
        </List.Item>
        <List.Item>
          <strong>How we use it:</strong> to create your account or sign you in,
          with your GitHub username as your CineXplorer username where it's
          available (otherwise one made from your name or email address), and
          your GitHub name as your name. We keep only the primary, verified
          address from that page, if one appears. As with Google, a matching
          verified email address can link GitHub sign-in to an existing account.
        </List.Item>
        <List.Item>
          <strong>How we store it:</strong> in the site's database, with a copy
          of the profile GitHub sent, updated at each sign-in, and when you
          first and last signed in with GitHub. We don't keep GitHub's access
          token with your account, and we have no access to your repositories.
          Sign-up requires GitHub to return a verified primary email address. If
          that address is missing, we keep the pending sign-in in your browser's
          session on our server, including the profile GitHub sent and its
          access token. The session rules under "How long we keep things"
          explain when pending sign-ins are cleared. Your session can retain
          your GitHub user ID after account deletion.
        </List.Item>
        <List.Item>
          You can revoke CineXplorer's access in your GitHub settings, under
          authorized OAuth apps. As with Google, that changes nothing here:
          signing in with GitHub again signs you in to the same account.
        </List.Item>
      </List.Root>
      <LegalHeading as="h3">Your movie lists</LegalHeading>
      <Text>When you're signed in, the site stores what you track:</Text>
      <List.Root ps={6} gap={2}>
        <List.Item>your watchlist, with when each film joined it;</List.Item>
        <List.Item>
          whether you've watched and liked each film, and when;
        </List.Item>
        <List.Item>each film's current rating, from 1 to 10;</List.Item>
        <List.Item>
          the viewings and reviews you log, as many per film as you like, each
          with the date you watched (if you give one), its own rating, a review
          of up to 10,000 characters, whether it was a rewatch, and when you
          logged and last edited it;
        </List.Item>
        <List.Item>
          a record of the changes you make to a film's watchlist, watched, liked
          and rating marks, removals as well as additions, each with its time
          and the day in your own time zone. Logging a viewing that changes a
          film's rating is recorded too. Undo can remove the film's latest
          recorded change to the mark or rating you restore.
        </List.Item>
      </List.Root>
      <Text>
        Your Library shows your lists, and its History shows your viewings,
        reviews and additions from the record. The site limits access to your
        Library and History to your account. The site operator can view the
        films you track, their watchlist, watched and liked marks and associated
        dates, and your current ratings in the admin area. Admin deletion
        previews also show viewing entry IDs and which tracking fields changed
        and when. Your tracking records are deleted with your account. To link
        your entries to the right film, the site also saves each film's details
        from TMDB (its TMDB ID, title, poster, release date, score, vote count,
        runtime, overview and genres), which say nothing about you.
      </Text>
      <LegalHeading as="h3">When you use the site</LegalHeading>
      <Text>This applies whether or not you have an account.</Text>
      <List.Root ps={6} gap={2}>
        <List.Item>
          <strong>Server logs.</strong> We log requests handled by the
          application server, including requests for admin styles and scripts.
          We record your IP address, your browser's identification string (user
          agent), the time, the address requested, the page you came from
          without its query, and the result. The web server serves app files
          such as JavaScript and styles without keeping a routine access log. We
          remove movie and admin search text and credentials in recognized
          fields from the logged address. Account events (signing up, signing
          in, renewing your session, verifying your email address and emails
          sent to you), including failed attempts, are also logged with your
          username or user ID where known, and sometimes your browser's
          identification string. If the web server cannot complete a request to
          the application server, for example while the site restarts, it can
          log the requested path, your IP address, your browser's identification
          string and the result. It leaves out the query, such as search text,
          and the address of the page you came from. Unexpected application
          errors can also leave technical details in the logs.
        </List.Item>
        <List.Item>
          <strong>Error reports.</strong> If something breaks in your browser,
          the site sends us an error report: the error message and technical
          details, the page's address (site and path only), your browser and
          device details (user agent, language, platform and window size), your
          user ID if you signed in with a password, and a random ID for that
          page visit. Before sending the report, your browser removes the failed
          request's headers, body and settings. It also filters out details
          labelled as passwords, tokens or other credentials.
        </List.Item>
        <List.Item>
          <strong>Abuse limits.</strong> To stop repeated or automated requests,
          the server briefly keeps counts of recent requests. It counts
          sign-ups, sign-ins, verification email resends, password resets and
          error reports by IP address. For sign-ups and password reset requests
          it also counts by a scrambled form of the email address you enter. It
          uses a scrambled form of the address Google supplies to limit the
          existing-account notice described under Email. The attempt counts even
          if delivery fails. It counts saves to your lists by account. For
          password session renewal, the server counts by the account tied to a
          valid signed-in session cookie when one is present, and by IP address
          otherwise. Each count ends within a minute to a day of the last
          request it counted, depending on the limit.
        </List.Item>
      </List.Root>
      <LegalHeading as="h3">Email</LegalHeading>
      <Text>
        The site sends email only when it's part of using an account. If you
        sign up with an email address and password, we send a verification email
        when you sign up (and again if you ask) and a welcome email once you've
        verified. We also send password-reset emails. If someone asks for a
        password reset for an address that has no account, we email that address
        to say so. If you try to sign in with a Google account that hasn't been
        linked to CineXplorer and Google sends an unverified email address that
        matches an existing account, we email that address a link to start
        password recovery. We limit how often we send this notice. Beyond these,
        we'd write to you only about the service itself, such as a change to
        this policy or the site closing, through the same email provider. We
        don't send newsletters or marketing.
      </Text>
      <LegalHeading as="h2">Cookies and browser storage</LegalHeading>
      <Text>
        The public site uses cookies for signing in, security and showing lists
        correctly. There are no advertising or analytics cookies.
      </Text>
      <LegalTableRegion label="Cookie table">
        <Table.Root variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Cookie</Table.ColumnHeader>
              <Table.ColumnHeader>What it's for</Table.ColumnHeader>
              <Table.ColumnHeader>How long it lasts</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>
                <Code>sessionid</Code>
              </Table.Cell>
              <Table.Cell>
                Keeps you signed in after a Google or GitHub sign-in. It's also
                set when you view movie lists, Home's included, so the site
                doesn't show you the same film twice across pages; the films
                already shown are kept on our server for an hour after you last
                load a page of that list.
              </Table.Cell>
              <Table.Cell>2 weeks</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>
                <Code>csrftoken</Code>
              </Table.Cell>
              <Table.Cell>
                Protects your requests against cross-site request forgery.
              </Table.Cell>
              <Table.Cell>1 year</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>
                <Code>refresh_token</Code>
              </Table.Cell>
              <Table.Cell>
                Keeps you signed in after an email-and-password sign-in. Page
                scripts can't read it.
              </Table.Cell>
              <Table.Cell>
                14 days if you chose "Remember me", otherwise until you close
                the browser
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </LegalTableRegion>
      <Text>
        The site also keeps some things in your browser's own storage. They stay
        on your device, except the sign-in token, which goes with each request,
        and saved error reports, which are sent to us once they can be:
      </Text>
      <List.Root ps={6} gap={2}>
        <List.Item>
          your sign-in token, when it expires, and a marker that you're signed
          in: with "Remember me", until you sign out or, once your sign-in has
          run out, until you next visit the site; otherwise until you close the
          tab;
        </List.Item>
        <List.Item>your theme and light or dark mode choice;</List.Item>
        <List.Item>
          where you'd scrolled to in up to 20 movie lists, including any search
          text, until you close the tab;
        </List.Item>
        <List.Item>
          a marker that a Google or GitHub sign-in is in progress, until you
          close the tab;
        </List.Item>
        <List.Item>
          a fingerprint of your advanced filters when you close that panel, so
          it stays closed, until you close the tab;
        </List.Item>
        <List.Item>
          a marker that the page reloaded after failing to load part of a new
          version of the site, until you close the tab;
        </List.Item>
        <List.Item>
          up to 10 reports of errors that stopped a page, if sending them to us
          failed, without your user ID and with the page's address cut to its
          site and path. Each is sent and removed once a later report gets
          through.
        </List.Item>
      </List.Root>
      <LegalHeading as="h2">Who else handles your data</LegalHeading>
      <List.Root ps={6} gap={2}>
        <List.Item>
          <strong>DigitalOcean</strong> hosts our server, in the United States
          (San Francisco).
        </List.Item>
        <List.Item>
          <strong>Cloudflare</strong> runs our domain's DNS. It doesn't carry
          the site's traffic. It also stores our database backups, in a private
          storage bucket, and forwards email sent to our contact address.
        </List.Item>
        <List.Item>
          <strong>Zoho CPaaS</strong> (formerly ZeptoMail) delivers the site's
          emails. It receives the recipient's address and the message, and keeps
          a log of each email (the sender and recipient, the subject, the time
          and whether it was delivered) and a copy of its content for 60 days.
        </List.Item>
        <List.Item>
          <strong>Google and GitHub</strong> handle sign-in when you choose
          them. Their own privacy policies apply to your use of their services.
        </List.Item>
        <List.Item>
          <strong>The Movie Database (TMDB)</strong> provides the film
          information and images. Our server asks TMDB for movie data, including
          the text you search for, but sends nothing that identifies you. Your
          browser loads posters and backdrops directly from TMDB's image
          servers, so TMDB receives your IP address and browser details, as any
          website hosting an image does.
        </List.Item>
        <List.Item>
          <strong>API documentation.</strong> If you open the site's API
          documentation, your browser loads its scripts and styles from jsDelivr
          and can request its icon from the Django Ninja website. These requests
          give those hosts your IP address and browser details.
        </List.Item>
      </List.Root>
      <Text>
        We don't sell, rent or trade personal data, or share it for advertising.
        We'd disclose information to anyone else only if the law required it.
      </Text>
      <LegalHeading as="h2">How long we keep things</LegalHeading>
      <List.Root ps={6} gap={2}>
        <List.Item>
          <strong>
            Your account, its linked Google or GitHub profile, and your
            remaining movie lists, viewings, reviews and change history:
          </strong>{" "}
          until your account is deleted. Viewing and review entries can be
          deleted sooner. Deleting a film's tracking record also deletes its
          entries and change history. Undo can remove the film's latest recorded
          change to the mark or rating you restore.
        </List.Item>
        <List.Item>
          <strong>Accounts whose email address is never verified:</strong> kept
          until deleted on request.
        </List.Item>
        <List.Item>
          <strong>Sign-in sessions and tokens:</strong> when you sign in with
          Google or GitHub, the server records the provider, your account ID
          with that provider, your CineXplorer user ID and the sign-in time in
          your session. Sessions expire two weeks after the server last saved
          them. CineXplorer access tokens expire after five minutes and its
          refresh tokens after 14 days. The server removes expired sessions and
          CineXplorer refresh-token records nightly.
        </List.Item>
        <List.Item>
          <strong>Return address during provider sign-in:</strong> when you
          start signing in with Google or GitHub, we save a return address in
          your session so we can bring you back to the site. It can include your
          movie search text. The sign-in attempt can be used for up to ten
          minutes. A response from the provider that matches the attempt clears
          that copy of the return address. If you leave before that response,
          the stored address can remain until a later sign-in clears the old
          attempt or the server removes the expired session. An incomplete
          sign-up can also keep the return address with the pending sign-in.
        </List.Item>
        <List.Item>
          <strong>Pending Google or GitHub sign-ins:</strong> we clear an
          earlier pending sign-in if a later Google or GitHub sign-in in that
          browser reaches our account checks and the server saves the removal.
          If you cancel the later attempt or it fails, those details can remain
          in your session. Starting another sign-in can extend the session's
          expiry. In the existing-account case described under Email, the
          pending verification step expires after 15 minutes. The email address
          can stay in the session until we clear that step or remove the expired
          session.
        </List.Item>
        <List.Item>
          <strong>Server logs:</strong> each service keeps about its most recent
          30 MB of logs, and older entries are overwritten. There's no fixed
          time limit.
        </List.Item>
        <List.Item>
          <strong>Admin activity records:</strong> the database records the
          action and time when we use the admin forms to add or edit an account
          or email record, or the admin delete action to remove an account,
          email record or movie tracking record. An audit entry can also include
          the affected record's ID, your username, the email address for an
          email record, the film's title for a tracking record, and the names of
          fields changed in an account edit. These records have no scheduled
          expiry.
        </List.Item>
        <List.Item>
          <strong>Backups:</strong> copies of the database, taken nightly and
          before each update of the site, are kept for 30 days. Anything deleted
          from the site stays in backups until they expire. A copy can also stay
          on our server until it's removed by hand: one from a backup that
          failed, or one made or downloaded to repair or restore the site.
        </List.Item>
        <List.Item>
          <strong>Abuse-limit counts:</strong> up to a day after the last
          request they count.
        </List.Item>
        <List.Item>
          <strong>Emails we send:</strong> Zoho CPaaS keeps a log and a copy of
          each for 60 days.
        </List.Item>
      </List.Root>
      <LegalHeading as="h2">Your choices</LegalHeading>
      <List.Root ps={6} gap={2}>
        <List.Item>
          <strong>See or correct your data.</strong> To see, correct or get a
          copy of what we hold about you, write to{" "}
          <Link
            href="mailto:cinexplorer@andrewcreekmore.dev"
            variant="underline"
          >
            cinexplorer@andrewcreekmore.dev
          </Link>
          .
        </List.Item>
        <List.Item>
          <strong>Delete your account.</strong> The site has no delete button
          yet. Write to{" "}
          <Link
            href="mailto:cinexplorer@andrewcreekmore.dev"
            variant="underline"
          >
            cinexplorer@andrewcreekmore.dev
          </Link>{" "}
          from your account's email address, and we'll delete your account, its
          email addresses, its linked Google or GitHub sign-ins, and your movie
          lists and their record of changes within 30 days. Copies remain in
          backups for up to 30 days, except a copy left on our server as
          described above, and in server logs until they're overwritten. Admin
          activity records, including records with your email address, can
          remain after your account is deleted. Deleting your account ends
          access to it. Existing sessions can retain the sign-in details
          described above, including your provider account ID. Session and
          refresh-token records can remain on our server until the nightly
          cleanup after they expire. Starting another Google or GitHub sign-in
          in the same browser can extend the session record's expiry.
        </List.Item>
        <List.Item>
          <strong>Google and GitHub sign-in.</strong> You can remove
          CineXplorer's access in your Google or GitHub settings, as described
          above. To unlink a Google or GitHub sign-in from your account, or
          delete what we keep from it, write to{" "}
          <Link
            href="mailto:cinexplorer@andrewcreekmore.dev"
            variant="underline"
          >
            cinexplorer@andrewcreekmore.dev
          </Link>
          .
        </List.Item>
        <List.Item>
          <strong>Reset your password</strong> from the sign-in page.
        </List.Item>
      </List.Root>
      <Text>
        <strong>If you're in the EU or UK.</strong> We use your account and
        movie-list data because we need it to provide the service you signed up
        for, and we keep server logs, error reports and abuse limits because we
        have a legitimate interest in keeping the site secure and working. You
        can ask to access, correct, delete or receive a copy of your data, and
        to object to or restrict how we use it, by writing to{" "}
        <Link href="mailto:cinexplorer@andrewcreekmore.dev" variant="underline">
          cinexplorer@andrewcreekmore.dev
        </Link>
        . You also have the right to complain to your local data-protection
        authority (in the UK, the Information Commissioner's Office).
      </Text>
      <LegalHeading as="h2">Security</LegalHeading>
      <Text>
        The site is served only over HTTPS. Passwords are stored as one-way
        hashes, the sign-in cookies can't be read by page scripts, and the
        site's admin area sits behind an extra password. Backups go to a private
        bucket over encrypted connections. No system is perfectly secure, but we
        work to protect what we hold.
      </Text>
      <LegalHeading as="h2">Children</LegalHeading>
      <Text>
        CineXplorer isn't meant for children under 13. We don't knowingly
        collect personal data from them; if you believe a child has created an
        account, write to{" "}
        <Link href="mailto:cinexplorer@andrewcreekmore.dev" variant="underline">
          cinexplorer@andrewcreekmore.dev
        </Link>{" "}
        and we'll delete it.
      </Text>
      <LegalHeading as="h2">Where your data is processed</LegalHeading>
      <Text>
        Our server and our email provider are in the United States, and our
        backups are stored in western North America. If you use the site from
        elsewhere, your data is transferred to and processed in those places.
      </Text>
      <LegalHeading as="h2">Changes to this policy</LegalHeading>
      <Text>
        We'll post any change here with a new effective date. Before using data
        in a way this policy doesn't describe, we'll tell you and ask for your
        consent where that's required, including for data received from Google.
      </Text>
      <LegalHeading as="h2">Contact</LegalHeading>
      <Text>
        Andrew Creekmore,{" "}
        <Link href="mailto:cinexplorer@andrewcreekmore.dev" variant="underline">
          cinexplorer@andrewcreekmore.dev
        </Link>
      </Text>
    </LegalDocument>
  );
}
