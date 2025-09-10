import { ROUTES } from "@/constants/routes";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import "./App.css";

import AuthContextProvider from "./components/auth/AuthContextProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import AuthLayout from "./components/layout/AuthLayout";
import LoadingLayout from "./components/layout/LoadingLayout";

// Lazy load page components
const Home = lazy(() => import("./pages/Home"));
const NowPlaying = lazy(() => import("./pages/movie/NowPlaying"));
const Login = lazy(() => import("./pages/user/Login"));
const TestLogin = lazy(() => import("./pages/user/TestLogin"));
const Register = lazy(() => import("./pages/user/Register"));
const VerifyEmail = lazy(() => import("./pages/user/VerifyEmail"));
const Profile = lazy(() => import("./pages/user/Profile"));
const Settings = lazy(() => import("./pages/user/Settings"));
const MovieDetail = lazy(() => import("./pages/movie/MovieDetail"));
const Upcoming = lazy(() => import("./pages/movie/Upcoming"));
const Popular = lazy(() => import("./pages/movie/Popular"));
const TopRated = lazy(() => import("./pages/movie/TopRated"));

const App: React.FC = () => {
	return (
		<BrowserRouter>
			<AuthContextProvider>
				<Suspense fallback={<LoadingLayout />}>
					<Routes>
						{/* Auth routes - separate layout */}
						<Route
							path={ROUTES.LOGIN}
							element={
								<AuthLayout>
									<Login />
								</AuthLayout>
							}
						/>
						<Route
							path={ROUTES.REGISTER}
							element={
								<AuthLayout>
									<Register />
								</AuthLayout>
							}
						/>
						<Route
							path={ROUTES.VERIFY_EMAIL}
							element={
								<AuthLayout>
									<VerifyEmail />
								</AuthLayout>
							}
						/>

						{/* Content routes - full app layout */}
						<Route element={<AppLayout />}>
							<Route path={ROUTES.HOME} element={<Home />} />
							<Route path={ROUTES.PROFILE} element={<Profile />} />
							<Route path={ROUTES.SETTINGS} element={<Settings />} />
							<Route path={ROUTES.NOW_PLAYING} element={<NowPlaying />} />
							<Route path={ROUTES.UPCOMING} element={<Upcoming />} />
							<Route path={ROUTES.POPULAR} element={<Popular />} />
							<Route path={ROUTES.TOP_RATED} element={<TopRated />} />
							<Route path={ROUTES.MOVIE_DETAIL} element={<MovieDetail />} />
							{/* ...other content routes... */}
						</Route>

						{/* temp/dev routes... */}
						<Route
							path={ROUTES.TEST_LOGIN}
							element={
								<ProtectedRoute>
									<TestLogin />
								</ProtectedRoute>
							}
						/>
					</Routes>
				</Suspense>
			</AuthContextProvider>
		</BrowserRouter>
	);
};

export default App;
