import { COLORS } from "@/constants/theme";
import tmdbLogo from "../../assets/tmdb_logo_alt_short.svg";
import { Box, Text, VStack } from "@chakra-ui/react";

const Footer = () => {
	return (
		<Box
			as="footer"
			w="100%"
			bg={COLORS.background.footer}
			py={2}
			textAlign="center"
			borderTop="1px solid"
			borderColor={COLORS.border.main}
			aria-label="Application footer with TMDB attribution"
			position="relative"
			zIndex={6} // Above sidebar (zIndex 5) and shadow (zIndex 4)
		>
			<VStack gap={2} alignItems="center">
				<Box display="inline-flex" alignItems="center" gap={2}>
					<Text fontSize="sm" color={COLORS.text.muted}>
						© 2025 CineXplorer. All rights reserved.
					</Text>
				</Box>
				<Box display="inline-flex" alignItems="center" gap={2}>
					<a
						href="https://www.themoviedb.org/documentation/api"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="TMDB API Documentation"
					>
						<img
							src={tmdbLogo}
							alt="TMDB Logo"
							style={{ height: "18px", opacity: 0.7 }}
						/>
					</a>
					<Text fontSize="sm" color={COLORS.text.muted}>
						This product uses the TMDB API but is not endorsed or certified by
						TMDB.
					</Text>
				</Box>
			</VStack>
		</Box>
	);
};

export default Footer;
