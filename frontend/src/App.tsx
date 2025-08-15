import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";

import AuthServiceProvider from "./components/AuthServiceProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import NowPlaying from "./pages/NowPlaying";
import Login from "./pages/Login";
import TestLogin from "./pages/TestLogin";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import MovieDetail from "./pages/MovieDetail";
import Upcoming from "./pages/Upcoming";

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
