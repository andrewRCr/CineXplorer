import { ROUTES } from "@/constants/routes";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import "./App.css";

import MovieCollectionLayout from "./components/movie/collection/MovieCollectionLayout";
import AppLayout from "./components/layout/AppLayout";
import AuthLayout from "./components/layout/AuthLayout";
import LoadingLayout from "./components/layout/LoadingLayout";
import AuthContextProvider from "./components/auth/AuthContextProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load page components
const NowPlaying = lazy(() => import("./pages/movie/NowPlaying"));
const Login = lazy(() => import("./pages/user/Login"));
const TestLogin = lazy(() => import("./pages/user/TestLogin"));
const Register = lazy(() => import("./pages/user/Register"));
const VerifyEmail = lazy(() => import("./pages/user/VerifyEmail"));
const Profile = lazy(() => import("./pages/user/Profile"));
const Watchlist = lazy(() => import("./pages/user/Watchlist"));
const Settings = lazy(() => import("./pages/user/Settings"));
const MovieDetail = lazy(() => import("./pages/movie/MovieDetail"));
const Upcoming = lazy(() => import("./pages/movie/Upcoming"));
const Popular = lazy(() => import("./pages/movie/Popular"));
const TopRated = lazy(() => import("./pages/movie/TopRated"));
const SearchResults = lazy(() => import("./pages/movie/SearchResults"));
const TypographyTest = lazy(() => import("./pages/TypographyTest"));

const App: React.FC = () => {
	return (
		<ErrorBoundary showErrorDetails={import.meta.env.MODE === 'development'}>
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
							{/* Redirect home to Popular movies */}
							<Route path={ROUTES.HOME} element={<Navigate to={ROUTES.POPULAR} replace />} />
							<Route path={ROUTES.PROFILE} element={<Profile />} />
							<Route path={ROUTES.WATCHLIST} element={<Watchlist />} />
							<Route path={ROUTES.SETTINGS} element={<Settings />} />

							{/* Movie collection routes with shared layout */}
							<Route
								path={ROUTES.MOVIES}
								element={
									<MovieCollectionLayout
										showFilters={true}
										filterStyle="minimal"
									/>
								}
							>
								<Route path="now-playing" element={<NowPlaying />} />
								<Route path="upcoming" element={<Upcoming />} />
								<Route path="popular" element={<Popular />} />
								<Route path="top-rated" element={<TopRated />} />
							</Route>

							{/* Search results with shared layout */}
							<Route
								path={ROUTES.SEARCH_RESULTS}
								element={
									<MovieCollectionLayout
										showFilters={false}
									/>
								}
							>
								<Route index element={<SearchResults />} />
							</Route>
							<Route path={ROUTES.MOVIE_DETAIL} element={<MovieDetail />} />
							<Route path={ROUTES.TYPOGRAPHY_TEST} element={<TypographyTest />} />
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
		</ErrorBoundary>
	);
};

export default App;
