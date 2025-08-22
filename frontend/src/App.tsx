import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";

import AuthServiceProvider from "./components/auth/AuthServiceProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Home from "./pages/Home";
import NowPlaying from "./pages/movie/NowPlaying";
import Login from "./pages/user/Login";
import TestLogin from "./pages/user/TestLogin";
import Register from "./pages/user/Register";
import Profile from "./pages/user/Profile";
import Settings from "./pages/user/Settings";
import MovieDetail from "./pages/movie/MovieDetail";
import Upcoming from "./pages/movie/Upcoming";

const App: React.FC = () => {
	return (
		<BrowserRouter>
			<AuthServiceProvider>
				<Routes>
					{/* general / account routes */}
					<Route path="/" element={<Home />} />
					<Route path="/profile" element={<Profile />} />
					<Route path="/settings" element={<Settings />} />
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route
						path="/testlogin"
						element={
							<ProtectedRoute>
								<TestLogin />
							</ProtectedRoute>
						}
					/>
					{/* content routes */}
					<Route path="/now-playing" element={<NowPlaying />} />
					<Route path="/upcoming" element={<Upcoming />} />
					<Route path="/movie/:id" element={<MovieDetail />} />
				</Routes>
			</AuthServiceProvider>
		</BrowserRouter>
	);
};

export default App;
