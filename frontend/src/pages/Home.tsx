import { COLORS } from "@/constants/theme";

const Home = () => {
	return (
		<div
			style={{
				background: COLORS.background.main,
				color: COLORS.text.main,
				minHeight: "100vh",
			}}
		>
			<h1>Welcome to the CineXplorer Home Page</h1>
			<p>This is the index page of our application.</p>
		</div>
	);
};

export default Home;
