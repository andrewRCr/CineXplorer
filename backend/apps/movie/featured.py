"""Hand-selected classic films for the homepage."""

from dataclasses import dataclass

from pydantic import BaseModel, Field


class FilmFocusPoint(BaseModel):
    """An image anchor expressed as paired percentages."""

    x: float = Field(ge=0, le=100, allow_inf_nan=False)
    y: float = Field(ge=0, le=100, allow_inf_nan=False)


@dataclass(frozen=True)
class FeaturedFilm:
    """A curated film with its optional image anchor, checked artwork, short title and mirroring.

    A short title replaces TMDB's only where the full title cannot fit the hero's credit space.
    A mirrored film's full-bleed image is flipped horizontally when shown, and its anchor is
    given in the flipped frame.
    """

    tmdb_id: int
    focus_point: FilmFocusPoint | None = None
    backdrop_path: str | None = None
    title: str | None = None
    mirrored: bool = False


# Add only films approved through artwork and credit review.
FEATURED_FILMS = (
    # Casablanca — 1943
    FeaturedFilm(289, backdrop_path="/87wqeMeUeMRLjsE1IWNKJcPlpuC.jpg"),
    # 8½ — 1963
    FeaturedFilm(
        422,
        focus_point=FilmFocusPoint(x=50, y=0),
        backdrop_path="/y2FNZLHynsevBnVTocGW6c3pQpr.jpg",
    ),
    # Citizen Kane — 1941
    FeaturedFilm(15, backdrop_path="/ruF3Lmd4A8MHbnEBE6lxPMbsHGL.jpg"),
    # Seven Samurai — 1954
    FeaturedFilm(
        346,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/qvZ91FwMq6O47VViAr8vZNQz3WI.jpg",
    ),
    # Alien — 1979
    FeaturedFilm(348, backdrop_path="/AmR3JG1VQVxU8TfAvljUhfSFUOx.jpg"),
    # Vertigo — 1958
    FeaturedFilm(426, backdrop_path="/rtVwkTqllcmyY4TVOycgVBHppWf.jpg"),
    # North by Northwest — 1959
    FeaturedFilm(
        213,
        focus_point=FilmFocusPoint(x=50, y=38.4),
        backdrop_path="/OR8oloCZ3klJtB7Y0i8pSqWw5a.jpg",
    ),
    # Lawrence of Arabia — 1962
    FeaturedFilm(
        947,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/eULrEMwgXnWmzdowUfegaw2YYgD.jpg",
    ),
    # Gone with the Wind — 1939
    FeaturedFilm(770, backdrop_path="/4FHcxMtVruMr7ltU2cItWssLjTP.jpg"),
    # 2001: A Space Odyssey — 1968
    FeaturedFilm(62, backdrop_path="/w5IDXtifKntw0ajv2co7jFlTQDM.jpg"),
    # The Graduate — 1967
    FeaturedFilm(37247, backdrop_path="/lIY8ZTp6OJTAMfiorDGsPsJ5LT.jpg"),
    # Five Easy Pieces — 1970
    FeaturedFilm(
        26617,
        focus_point=FilmFocusPoint(x=50, y=15),
        backdrop_path="/y7pnEmBotaowRY0o8V33r4JuRNS.jpg",
    ),
    # Taxi Driver — 1976
    FeaturedFilm(103, backdrop_path="/9uddYYTNcLWpzUkl5iw1RUYhLhY.jpg"),
    # Tokyo Story — 1953
    FeaturedFilm(
        18148,
        focus_point=FilmFocusPoint(x=50, y=18),
        backdrop_path="/jLq0ol1f0ZKXni9R9GsPBcyPrNN.jpg",
    ),
    # Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb — 1964
    FeaturedFilm(
        935,
        focus_point=FilmFocusPoint(x=50, y=100),
        backdrop_path="/7i0L2ee4Iy0aXV6vR5u1ZmblOrx.jpg",
        title="Dr. Strangelove",
    ),
    # A Clockwork Orange — 1971
    FeaturedFilm(185, backdrop_path="/nLFxvLokHe3bQmrmAfljIfax2jQ.jpg"),
    # Apocalypse Now — 1979
    FeaturedFilm(28, backdrop_path="/49fzLedFVKgGgFChLMuulDJBY1c.jpg"),
    # The Godfather — 1972
    FeaturedFilm(238, backdrop_path="/tSPT36ZKlP2WVHJLM4cQPLSzv3b.jpg"),
    # The Godfather Part II — 1974
    FeaturedFilm(240, backdrop_path="/pGzqRKrYeK4LogoysNro0vG8d8N.jpg"),
    # Midnight Cowboy — 1969
    FeaturedFilm(
        3116,
        focus_point=FilmFocusPoint(x=50, y=100),
        backdrop_path="/wY04PHkTBqdlaEbsDj6cchfRL98.jpg",
    ),
    # Persona — 1966
    FeaturedFilm(797, backdrop_path="/amr72SENYz7AM4Hq5WBXxFBJEY6.jpg"),
    # The Deer Hunter — 1978
    FeaturedFilm(11778, backdrop_path="/a5zBQfXmLk3qqRYF7AioWpiAxk2.jpg"),
    # Network — 1976
    FeaturedFilm(10774, backdrop_path="/m4Iyzh9YVOh0ra7UwdMoJcrjxkx.jpg"),
    # The French Connection — 1971
    FeaturedFilm(1051, backdrop_path="/AsaW2VwcArvQmYjf2wsDjqWEn6f.jpg"),
    # Close Encounters of the Third Kind — 1977
    FeaturedFilm(840, backdrop_path="/yBCekmb7vK70xUhtsRQBcTu65sB.jpg"),
    # The Wild Bunch — 1969
    FeaturedFilm(
        576,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/nkgWcfOeQnVnxak5xCKvkRDLt5H.jpg",
    ),
    # Straw Dogs — 1971
    FeaturedFilm(994, backdrop_path="/8Mngxf4aE99eyDHCvGo8sfyQd9C.jpg"),
    # Breathless — 1960
    FeaturedFilm(269, backdrop_path="/4WGuyWf1f94CsEeVIIqDKGw5rmO.jpg"),
    # All the President's Men — 1976
    FeaturedFilm(
        891,
        focus_point=FilmFocusPoint(x=50, y=60),
        backdrop_path="/p2U4wScUValTXnvikXy7kfQNDsH.jpg",
    ),
    # Jaws — 1975
    FeaturedFilm(
        578,
        focus_point=FilmFocusPoint(x=50, y=60),
        backdrop_path="/i1yf91svRHX45l9BXL8rVFzLoPH.jpg",
    ),
    # A Fistful of Dollars — 1964
    FeaturedFilm(
        391,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/9gMkOYzk7P9QXwndhLRAC8cMZcJ.jpg",
    ),
    # The Good, the Bad and the Ugly — 1966
    FeaturedFilm(
        429,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/x4biAVdPVCghBlsVIzB6NmbghIz.jpg",
    ),
    # The 400 Blows — 1959
    FeaturedFilm(147, backdrop_path="/9w0Kk8Sleb4tkCFEUcvibMzaa16.jpg"),
    # Last Tango in Paris — 1972
    FeaturedFilm(
        1643,
        focus_point=FilmFocusPoint(x=50, y=40),
        backdrop_path="/hExTiLbfB93HwEwkeQxb3q4nHtQ.jpg",
    ),
    # Dog Day Afternoon — 1975
    FeaturedFilm(968, backdrop_path="/ahqTRP5mPOm3fMO8WjXbHlaF4Mo.jpg"),
    # The Exorcist — 1973
    FeaturedFilm(9552, backdrop_path="/xcjJ5khg2yzOa282mza39Lbrm7j.jpg"),
    # The Seventh Seal — 1957
    FeaturedFilm(
        490,
        focus_point=FilmFocusPoint(x=50, y=60),
        backdrop_path="/6s2BqtDvp1BMiP70zCDU5OW6hMy.jpg",
    ),
    # Rashomon — 1950
    FeaturedFilm(548, backdrop_path="/tDn1dA52bQH9B85vilHeU7C83W1.jpg"),
    # For a Few Dollars More — 1965
    FeaturedFilm(938, backdrop_path="/hs6OPto38fF589ScpGhl7uSU4MI.jpg"),
    # The Texas Chain Saw Massacre — 1974
    FeaturedFilm(
        30497,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/wvBx1Q1FcQE1BPLfBbgA3y9aaS1.jpg",
    ),
    # Once Upon a Time in the West — 1968
    FeaturedFilm(
        335,
        focus_point=FilmFocusPoint(x=50, y=50),
        backdrop_path="/u5IhDThM1SClL4pkCUp8hOmsDQJ.jpg",
    ),
    # Raging Bull — 1980
    FeaturedFilm(1578, backdrop_path="/tvNuhRlpRozDgsX1zR9gQ2aHv1X.jpg"),
    # Blade Runner — 1982
    FeaturedFilm(
        78,
        focus_point=FilmFocusPoint(x=50, y=65),
        backdrop_path="/2spEHYDcyE9r9mS7AFEscfKVDzO.jpg",
    ),
    # The Shining — 1980
    FeaturedFilm(
        694,
        focus_point=FilmFocusPoint(x=50, y=15),
        backdrop_path="/AdKA2F1SzYPhSZdEbjH1Zh75UVQ.jpg",
    ),
    # Full Metal Jacket — 1987
    FeaturedFilm(
        600,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/3k2TRmqMjgt7tcwkYwZQdctnty3.jpg",
    ),
    # Blue Velvet — 1986
    FeaturedFilm(
        793,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/s1CBwblInR0ZBIv59CSko2QdLD3.jpg",
        mirrored=True,
    ),
    # The Terminator — 1984
    FeaturedFilm(218, backdrop_path="/ffdqHMWkh1h9MABwIfbfRJhgFW6.jpg"),
    # Dangerous Liaisons — 1988
    FeaturedFilm(
        859,
        focus_point=FilmFocusPoint(x=50, y=5),
        backdrop_path="/xH9mjObdAatWoHpT912DDK8hEYG.jpg",
    ),
    # Predator — 1987
    FeaturedFilm(
        106,
        focus_point=FilmFocusPoint(x=50, y=40),
        backdrop_path="/YL3GPOiDcNraIJOVDCZsoOBoDy.jpg",
    ),
    # Scarface — 1983
    FeaturedFilm(111, backdrop_path="/cCvp5Sni75agCtyJkNOMapORUQV.jpg"),
    # The Thing — 1982
    FeaturedFilm(
        1091,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/r9leYNa8nTRCceZrZhP1DXkgKVb.jpg",
    ),
    # Aliens — 1986
    FeaturedFilm(
        679,
        focus_point=FilmFocusPoint(x=50, y=20),
        backdrop_path="/4kix6fAblJIH6eMs0Ku2loyZJXK.jpg",
        mirrored=True,
    ),
    # GoodFellas — 1990
    FeaturedFilm(
        769,
        focus_point=FilmFocusPoint(x=50, y=15),
        backdrop_path="/gILte6Zd7m1YneIr6MVhh30S9pr.jpg",
    ),
    # The Silence of the Lambs — 1991
    FeaturedFilm(
        274,
        focus_point=FilmFocusPoint(x=50, y=25),
        backdrop_path="/mbOx1wxMLikzwWUO9TKAcFIy6op.jpg",
        mirrored=True,
    ),
    # Terminator 2: Judgment Day — 1991
    FeaturedFilm(
        280,
        focus_point=FilmFocusPoint(x=50, y=20),
        backdrop_path="/izkMjmhauFx9DjoBQqM5sM5WAwE.jpg",
    ),
    # Glengarry Glen Ross — 1992
    FeaturedFilm(
        9504,
        focus_point=FilmFocusPoint(x=50, y=15),
        backdrop_path="/qukaw3P4MOFNdxjhNpClhT9unr8.jpg",
    ),
    # Reservoir Dogs — 1992
    FeaturedFilm(500, backdrop_path="/jwt159hXWA9Q5xpBo8hWb3zwLi7.jpg"),
    # Unforgiven — 1992
    FeaturedFilm(
        33,
        focus_point=FilmFocusPoint(x=50, y=70),
        backdrop_path="/rvRGFevvZK48onX0PYI1eQLbuJd.jpg",
    ),
    # Jurassic Park — 1993
    FeaturedFilm(
        329,
        focus_point=FilmFocusPoint(x=50, y=100),
        backdrop_path="/f082quUW2kAtZXFZVGEfhwacZoG.jpg",
    ),
    # Fight Club — 1999
    FeaturedFilm(
        550,
        focus_point=FilmFocusPoint(x=50, y=60),
        backdrop_path="/c6OLXfKAk5BKeR6broC8pYiCquX.jpg",
    ),
    # Leaving Las Vegas — 1995
    FeaturedFilm(
        451,
        focus_point=FilmFocusPoint(x=50, y=75),
        backdrop_path="/ckTh7Ej33m9O4eiKDQ1u91Opd9N.jpg",
        mirrored=True,
    ),
    # Trainspotting — 1996
    FeaturedFilm(627, backdrop_path="/dkfBKDUIWP1peEszdqK10MkMZCP.jpg"),
    # Schindler's List — 1993
    FeaturedFilm(
        424,
        focus_point=FilmFocusPoint(x=50, y=25),
        backdrop_path="/zb6fM1CX41D9rF9hdgclu0peUmy.jpg",
    ),
    # Pulp Fiction — 1994
    FeaturedFilm(680, backdrop_path="/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg"),
    # Casino — 1995
    FeaturedFilm(
        524,
        focus_point=FilmFocusPoint(x=70, y=0),
        backdrop_path="/iZGiMD0p1M2AOmzKknFo5bkuz94.jpg",
    ),
    # Heat — 1995
    FeaturedFilm(
        949,
        focus_point=FilmFocusPoint(x=50, y=75),
        backdrop_path="/uI22JkEMediWyiRqhllNqeeGtW0.jpg",
    ),
    # Fargo — 1996
    FeaturedFilm(
        275,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/747dgDfL5d8esobk7h4odaOFhUq.jpg",
    ),
    # Gattaca — 1997
    FeaturedFilm(
        782,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/hPsCR1ny6GnctJkWqeJwihTDD7T.jpg",
    ),
    # Léon: The Professional — 1994
    FeaturedFilm(101, backdrop_path="/fj0hwDJEOOHllRim2BMt5L7tbjf.jpg"),
    # Lost Highway — 1997
    FeaturedFilm(
        638,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/hGnJhGSeyWlerHcLNnD06sbX5wU.jpg",
    ),
    # Boogie Nights — 1997
    FeaturedFilm(
        4995,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/ArpTzQZHWh4UVsgUvV6S7WjTq1n.jpg",
    ),
    # Dancer in the Dark — 2000
    FeaturedFilm(16, backdrop_path="/vxvzf0cGtFY2Vpw5ULWumCIW6Ri.jpg"),
    # American Beauty — 1999
    FeaturedFilm(14, backdrop_path="/2ndw55F40IkALzWyjCCza3M6nqM.jpg"),
    # Saving Private Ryan — 1998
    FeaturedFilm(
        857,
        focus_point=FilmFocusPoint(x=50, y=47),
        backdrop_path="/rW2xRFlJRbTnBJlQTSjQmjevIwb.jpg",
    ),
    # Amélie — 2001
    FeaturedFilm(
        194,
        focus_point=FilmFocusPoint(x=50, y=40),
        backdrop_path="/6n53UI4mX9QMfe2S0Pgt8mGebY1.jpg",
    ),
    # The Shawshank Redemption — 1994
    FeaturedFilm(
        278,
        focus_point=FilmFocusPoint(x=50, y=20),
        backdrop_path="/pNjh59JSxChQktamG3LMp9ZoQzp.jpg",
    ),
    # The Matrix — 1999
    FeaturedFilm(
        603,
        focus_point=FilmFocusPoint(x=50, y=40),
        backdrop_path="/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg",
        mirrored=True,
    ),
    # Magnolia — 1999
    FeaturedFilm(
        334,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/mFfyE5DPFDqoes4HIcElHc2a15y.jpg",
    ),
    # Eyes Wide Shut — 1999
    FeaturedFilm(
        345,
        focus_point=FilmFocusPoint(x=50, y=51),
        backdrop_path="/aC6wW62V6b0csr5iUnbOjYAqfhg.jpg",
    ),
    # Requiem for a Dream — 2000
    FeaturedFilm(
        641,
        focus_point=FilmFocusPoint(x=50, y=60),
        backdrop_path="/fAGYRJCujRBMw7TCuTp893eSG8e.jpg",
    ),
    # Mulholland Drive — 2001
    FeaturedFilm(
        1018,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/kxgrGGbifN60x5BopH4wk7T4Twe.jpg",
    ),
    # The Departed — 2006
    FeaturedFilm(
        1422,
        focus_point=FilmFocusPoint(x=50, y=57),
        backdrop_path="/6WRrGYalXXveItfpnipYdayFkQB.jpg",
    ),
    # Children of Men — 2006
    FeaturedFilm(
        9693,
        focus_point=FilmFocusPoint(x=50, y=40),
        backdrop_path="/www52jvhbB0ppe9s0zxbf9EYox.jpg",
    ),
    # Being John Malkovich — 1999
    FeaturedFilm(
        492,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/1Nyjb7aeRKynWgmOl8he5ZcvWLm.jpg",
    ),
    # Punch-Drunk Love — 2002
    FeaturedFilm(
        8051,
        focus_point=FilmFocusPoint(x=50, y=35),
        backdrop_path="/q8GwhIAttJwqmjDtbLW8JvEMMdw.jpg",
    ),
    # Kill Bill: Vol. 1 — 2003
    FeaturedFilm(
        24, focus_point=FilmFocusPoint(x=50, y=0), backdrop_path="/iffzIhuLAO38Po6sh1s6ZEVwlNL.jpg"
    ),
    # Kill Bill: Vol. 2 — 2004
    FeaturedFilm(
        393,
        focus_point=FilmFocusPoint(x=85, y=20),
        backdrop_path="/pgG6tzJzC8mjGqhaT8IWwEk00xf.jpg",
        mirrored=True,
    ),
    # Collateral — 2004
    FeaturedFilm(
        1538,
        focus_point=FilmFocusPoint(x=50, y=40),
        backdrop_path="/qVzmXKKOTtd3szkiCheCNrfa394.jpg",
    ),
    # 3:10 to Yuma — 2007
    FeaturedFilm(
        5176,
        focus_point=FilmFocusPoint(x=50, y=95),
        backdrop_path="/2eznGndOi8s9CGReAvcQ8PEULwm.jpg",
    ),
    # Casino Royale — 2006
    FeaturedFilm(
        36557,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/klJMCIblHLFwCuGjKz7tyOpekIC.jpg",
        mirrored=True,
    ),
    # The Hurt Locker — 2008
    FeaturedFilm(
        12162,
        focus_point=FilmFocusPoint(x=50, y=60),
        backdrop_path="/off0xgvtfHY82l3MC4mDpCk1APY.jpg",
    ),
    # The Dark Knight — 2008
    FeaturedFilm(
        155,
        focus_point=FilmFocusPoint(x=50, y=70),
        backdrop_path="/cfT29Im5VDvjE0RpyKOSdCKZal7.jpg",
        mirrored=True,
    ),
    # A Serious Man — 2009
    FeaturedFilm(
        12573,
        focus_point=FilmFocusPoint(x=50, y=40),
        backdrop_path="/6j3YrwkG4TZo8oNR4U4SDpql4pP.jpg",
    ),
    # There Will Be Blood — 2007
    FeaturedFilm(
        7345,
        focus_point=FilmFocusPoint(x=10, y=85),
        backdrop_path="/9UAKA6ceZi6TgQwTAAMt7DWwYPI.jpg",
        mirrored=True,
    ),
    # Moon — 2009
    FeaturedFilm(
        17431,
        focus_point=FilmFocusPoint(x=50, y=48),
        backdrop_path="/mvUAo9ACgmLpS4Ofc2IwD4n7WCt.jpg",
    ),
    # Drive — 2011
    FeaturedFilm(
        64690,
        focus_point=FilmFocusPoint(x=50, y=20),
        backdrop_path="/hoyAALgfmjMEK7O1wZ4r8wT91RP.jpg",
    ),
    # Ex Machina — 2015
    FeaturedFilm(
        264660,
        focus_point=FilmFocusPoint(x=50, y=80),
        backdrop_path="/uqOuJ50EtTj7kkDIXP8LCg7G45D.jpg",
    ),
    # Prisoners — 2013
    FeaturedFilm(
        146233,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/3RFmTz5h2UuFWEV4oH00XICBR9y.jpg",
    ),
    # Whiplash — 2014
    FeaturedFilm(
        244786,
        focus_point=FilmFocusPoint(x=50, y=0),
        backdrop_path="/fRGxZuo7jJUWQsVg9PREb98Aclp.jpg",
    ),
    # Killing Them Softly — 2012
    FeaturedFilm(64689, backdrop_path="/4xGuNyCX46pwEpdQISRYiaBXEN7.jpg", mirrored=True),
    # The Revenant — 2015
    FeaturedFilm(
        281957,
        focus_point=FilmFocusPoint(x=50, y=50),
        backdrop_path="/hEQYZq2CDB2LSJVxxlazdBOKeyW.jpg",
    ),
    # Django Unchained — 2012
    FeaturedFilm(
        68718,
        focus_point=FilmFocusPoint(x=50, y=5),
        backdrop_path="/2oZklIzUbvZXXzIFzv7Hi68d6xf.jpg",
    ),
    # The Favourite — 2018
    FeaturedFilm(
        375262,
        focus_point=FilmFocusPoint(x=50, y=60),
        backdrop_path="/iSskYDN193CJfTbSpFfscSwZ9Sx.jpg",
    ),
    # The Master — 2012
    FeaturedFilm(
        68722,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/6vvt0ghvrrzEB8Z1BLvmHOWUdxw.jpg",
    ),
    # Gone Girl — 2014
    FeaturedFilm(210577, backdrop_path="/iWak7wT0j6ycCc8lKr4NBz9c7n5.jpg"),
    # Sicario — 2015
    FeaturedFilm(
        273481,
        focus_point=FilmFocusPoint(x=50, y=70),
        backdrop_path="/fKPgObonYgPgCdu88yjV7Hpn7Dp.jpg",
        mirrored=True,
    ),
    # Mad Max: Fury Road — 2015
    FeaturedFilm(
        76341,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/gqrnQA6Xppdl8vIb2eJc58VC1tW.jpg",
    ),
    # Michael Clayton — 2007
    FeaturedFilm(4566, backdrop_path="/8j6GP3wOkUDIC7DZDsAyaDsr1el.jpg"),
    # The Assassination of Jesse James by the Coward Robert Ford — 2007
    FeaturedFilm(
        4512,
        focus_point=FilmFocusPoint(x=50, y=5),
        backdrop_path="/3HvQ5PaxwQJEiRSZD5AyVuqEiNn.jpg",
    ),
    # Phantom Thread — 2017
    FeaturedFilm(
        400617,
        focus_point=FilmFocusPoint(x=50, y=65),
        backdrop_path="/sJZd1H4cl2Nxhj0nutVCK5pMczL.jpg",
        mirrored=True,
    ),
    # Annihilation — 2018
    FeaturedFilm(
        300668,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/9trZvBr44UGedUOiGo3jgSUw13e.jpg",
    ),
    # Blade Runner 2049 — 2017
    FeaturedFilm(
        335984,
        focus_point=FilmFocusPoint(x=50, y=75),
        backdrop_path="/gNdLJU9TxrpGx4dkZidjys3fyy0.jpg",
    ),
    # Suspiria — 2018
    FeaturedFilm(
        361292,
        focus_point=FilmFocusPoint(x=50, y=75),
        backdrop_path="/k4renoGJzagylgBYWbpjQLYGAfB.jpg",
        mirrored=True,
    ),
    # Brawl in Cell Block 99 — 2017
    FeaturedFilm(
        398175,
        focus_point=FilmFocusPoint(x=70, y=40),
        backdrop_path="/ct2r3CqnA0KtMfib4AvfBU1W9M2.jpg",
        mirrored=True,
    ),
    # Beasts of No Nation — 2015
    FeaturedFilm(
        283587,
        focus_point=FilmFocusPoint(x=50, y=20),
        backdrop_path="/vDfbeUK3OhoeyQRlUODwfSy6tyE.jpg",
    ),
    # Dogtooth — 2009
    FeaturedFilm(38810, backdrop_path="/hiSC94dJJbF4YxgUpMFrQYTKdaT.jpg"),
    # Under the Skin — 2014
    FeaturedFilm(
        97370,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/eS5OdKN3kRZXQbWRSSCJ4Gh0z26.jpg",
    ),
    # A Most Violent Year — 2014
    FeaturedFilm(
        241239,
        focus_point=FilmFocusPoint(x=50, y=40),
        backdrop_path="/wjfJy0jXpbtUuSkFxUeF8W4RrEo.jpg",
    ),
    # The Killing of a Sacred Deer — 2017
    FeaturedFilm(
        399057,
        focus_point=FilmFocusPoint(x=50, y=100),
        backdrop_path="/kJwQXgAk440l2vZOspUJee6inim.jpg",
    ),
    # First Reformed — 2018
    FeaturedFilm(
        458737,
        focus_point=FilmFocusPoint(x=50, y=20),
        backdrop_path="/mLwIDLa1FMkbKLteZRTatyvWLHX.jpg",
    ),
    # Strange Darling — 2024
    FeaturedFilm(1029281, backdrop_path="/I4ofwq3XfmwXAETUs5pjubcMJ0.jpg"),
    # Bone Tomahawk — 2015
    FeaturedFilm(
        294963,
        focus_point=FilmFocusPoint(x=50, y=40),
        backdrop_path="/orXMq2jZy8wFmePv7zXS2Kor7Ug.jpg",
    ),
    # The Void — 2016
    FeaturedFilm(
        378018,
        focus_point=FilmFocusPoint(x=50, y=100),
        backdrop_path="/oZwwwezJFlHmQGBRJDLmENXwOIt.jpg",
    ),
    # The Witch — 2016
    FeaturedFilm(
        310131,
        focus_point=FilmFocusPoint(x=50, y=15),
        backdrop_path="/zi2oYYNSSv7t44iSt5YrxHX9PYs.jpg",
    ),
    # Slow West — 2015
    FeaturedFilm(
        223485,
        focus_point=FilmFocusPoint(x=50, y=15),
        backdrop_path="/HQES024QzKwPBO8YcKPCrgbF3Z.jpg",
    ),
    # The Wrestler — 2008
    FeaturedFilm(
        12163,
        focus_point=FilmFocusPoint(x=50, y=50),
        backdrop_path="/wcJmFsz8RqIhozMwvU81hreTX4i.jpg",
    ),
    # The Lighthouse — 2019
    FeaturedFilm(
        503919,
        focus_point=FilmFocusPoint(x=50, y=60),
        backdrop_path="/sYLzRuEcwSz0L1Z92wQNrETHU9O.jpg",
    ),
    # Gummo — 1997
    FeaturedFilm(
        18415,
        focus_point=FilmFocusPoint(x=50, y=15),
        backdrop_path="/mLdMnoIE4SjMkTkgxayaHH9DS4.jpg",
    ),
    # Julien Donkey-Boy — 1999
    FeaturedFilm(
        42881,
        focus_point=FilmFocusPoint(x=50, y=50),
        backdrop_path="/v3JIMHgB6QlLrT1LCQ3eaiXAQc6.jpg",
    ),
    # Funny Games — 2008
    FeaturedFilm(
        8461,
        focus_point=FilmFocusPoint(x=50, y=40),
        backdrop_path="/zsx28vZqh9ACu8gfWaMhJyOuPKm.jpg",
    ),
    # One Battle After Another — 2025
    FeaturedFilm(1054867, backdrop_path="/hiazLNa1UXuX35OTnMQRKOx3eTk.jpg"),
    # Weapons — 2025
    FeaturedFilm(
        1078605,
        focus_point=FilmFocusPoint(x=50, y=60),
        backdrop_path="/8VyTWJrNEyV2MTWvniDVp0MpOAe.jpg",
    ),
    # Uncut Gems — 2019
    FeaturedFilm(
        473033,
        focus_point=FilmFocusPoint(x=50, y=45),
        backdrop_path="/eGljNfNCrPhFYG2RXXmmE0OKu5.jpg",
    ),
    # Sinners — 2025
    FeaturedFilm(
        1233413,
        focus_point=FilmFocusPoint(x=50, y=10),
        backdrop_path="/j7KqDRzjbvIjDv7cdHz9G3ZYEQy.jpg",
    ),
    # The Odyssey — 2026
    FeaturedFilm(
        1368337,
        focus_point=FilmFocusPoint(x=50, y=18),
        backdrop_path="/twiVn9oFXOVR0uoYgawyEBlnFu8.jpg",
    ),
)
