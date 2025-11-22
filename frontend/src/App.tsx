import { ROUTES } from "@/constants/routes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import "./App.css";

import MovieCollectionLayout from "./components/movie/collection/MovieCollectionLayout";
import AppLayout from "./components/layout/AppLayout";
import AuthLayout from "./components/layout/AuthLayout";
import LoadingLayout from "./components/layout/LoadingLayout";
import AuthContextProvider from "./components/auth/AuthContextProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/core/ErrorBoundary";

// Lazy load page components
const Featured = lazy(() => import("./pages/movie/Featured"));
const Browse = lazy(() => import("./pages/movie/Browse"));
const NowPlaying = lazy(() => import("./pages/movie/NowPlaying"));
const Upcoming = lazy(() => import("./pages/movie/Upcoming"));
const Login = lazy(() => import("./pages/user/Login"));
const TestLogin = lazy(() => import("./pages/user/TestLogin"));
const Register = lazy(() => import("./pages/user/Register"));
const VerifyEmail = lazy(() => import("./pages/user/VerifyEmail"));
const Profile = lazy(() => import("./pages/user/Profile"));
const Watchlist = lazy(() => import("./pages/user/Watchlist"));
const Settings = lazy(() => import("./pages/user/Settings"));
const MovieDetail = lazy(() => import("./pages/movie/MovieDetail"));
const SearchResults = lazy(() => import("./pages/movie/SearchResults"));
const TypographyDebug = lazy(() => import("./pages/dev/TypographyDebug"));
const ThemeDebug = lazy(() => import("./pages/dev/theme-debug/ThemeDebug"));
const LayoutDebug = lazy(() => import("./pages/dev/LayoutDebug"));
const NotFound = lazy(() => import("./pages/core/NotFound"));
const Forbidden = lazy(() => import("./pages/core/Forbidden"));

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
              {/* Home IS the Featured landing page */}
              <Route path={ROUTES.HOME} element={<Featured />} />
              {/* /featured redirects to home (alias for explicit nav reference) */}
              <Route path={ROUTES.FEATURED} element={<Navigate to={ROUTES.HOME} replace />} />
              <Route path={ROUTES.PROFILE} element={<Profile />} />
              <Route path={ROUTES.WATCHLIST} element={<Watchlist />} />
              <Route path={ROUTES.SETTINGS} element={<Settings />} />

              {/* Browse routes with shared layout */}
              <Route
                path={ROUTES.BROWSE}
                element={
                  <MovieCollectionLayout
                    showFilters={true}
                    filterStyle="minimal"
                  />
                }
              >
                <Route index element={<Browse />} />
                <Route path="now-playing" element={<NowPlaying />} />
                <Route path="upcoming" element={<Upcoming />} />
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
              <Route path={ROUTES.TYPOGRAPHY_TEST} element={<TypographyDebug />} />
              <Route path="/dev/theme-debug" element={<ThemeDebug />} />
              <Route path="/dev/layout-debug" element={<LayoutDebug />} />
              {/* System pages */}
              <Route path="/forbidden" element={<Forbidden />} />
              {/* Catch-all 404 route - must be last */}
              <Route path="*" element={<NotFound />} />
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
