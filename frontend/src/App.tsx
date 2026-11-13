import { ROUTES } from "@/constants/routes";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { lazy, Suspense } from "react";
import "./App.css";

import MovieCollectionLayout from "./components/movie/collection/MovieCollectionLayout";
import AppLayout from "./components/layout/AppLayout";
import AuthLayout from "./components/layout/AuthLayout";
import LoadingContent from "./components/layout/LoadingContent";
import AuthContextProvider from "./components/auth/AuthContextProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ErrorBoundary from "./components/core/ErrorBoundary";

// Lazy load page components
const Featured = lazy(() => import("./pages/movie/Featured"));
const Browse = lazy(() => import("./pages/movie/Browse"));
const BrowseSequential = import.meta.env.DEV
  ? lazy(() => import("./pages/movie/BrowseSequential"))
  : null;
const NowPlaying = lazy(() => import("./pages/movie/NowPlaying"));
const Upcoming = lazy(() => import("./pages/movie/Upcoming"));
const Login = lazy(() => import("./pages/user/Login"));
const TestLogin = import.meta.env.DEV
  ? lazy(() => import("./pages/user/TestLogin"))
  : null;
const Register = lazy(() => import("./pages/user/Register"));
const ForgotPassword = lazy(() => import("./pages/user/ForgotPassword"));
const Profile = lazy(() => import("./pages/user/Profile"));
const Watchlist = lazy(() => import("./pages/user/Watchlist"));
const Settings = lazy(() => import("./pages/user/Settings"));
const MovieDetail = lazy(() => import("./pages/movie/MovieDetail"));
const SearchResults = lazy(() => import("./pages/movie/SearchResults"));
const TypographyDebug = import.meta.env.DEV
  ? lazy(() => import("./pages/dev/TypographyDebug"))
  : null;
const ThemeDebug = import.meta.env.DEV
  ? lazy(() => import("./pages/dev/theme-debug/ThemeDebug"))
  : null;
const LayoutDebug = import.meta.env.DEV
  ? lazy(() => import("./pages/dev/LayoutDebug"))
  : null;
const NotFound = lazy(() => import("./pages/core/NotFound"));
const Forbidden = lazy(() => import("./pages/core/Forbidden"));

const App: React.FC = () => {
  return (
    <ErrorBoundary showErrorDetails={import.meta.env.MODE === "development"}>
      <BrowserRouter>
        <AuthContextProvider>
          <Suspense fallback={<LoadingContent mode="layout" />}>
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
                path={ROUTES.FORGOT_PASSWORD}
                element={
                  <AuthLayout>
                    <ForgotPassword />
                  </AuthLayout>
                }
              />

              {/* Content routes - full app layout */}
              <Route element={<AppLayout />}>
                {/* Home IS the Featured landing page */}
                <Route path={ROUTES.HOME} element={<Featured />} />
                {/* /featured redirects to home (alias for explicit nav reference) */}
                <Route
                  path={ROUTES.FEATURED}
                  element={<Navigate to={ROUTES.HOME} replace />}
                />
                {/* Pages that need a signed-in user */}
                <Route element={<ProtectedRoute />}>
                  <Route path={ROUTES.PROFILE} element={<Profile />} />
                  <Route path={ROUTES.WATCHLIST} element={<Watchlist />} />
                  <Route path={ROUTES.SETTINGS} element={<Settings />} />
                </Route>

                {/* Browse routes - main layout (title in GridHeader) */}
                <Route
                  path={ROUTES.BROWSE}
                  element={
                    <MovieCollectionLayout
                      showBrowseControls={true}
                      renderPageHeader={false}
                    />
                  }
                >
                  <Route index element={<Browse />} />
                  <Route path="now-playing" element={<NowPlaying />} />
                  <Route path="upcoming" element={<Upcoming />} />
                </Route>

                {BrowseSequential && (
                  <Route
                    path={ROUTES.BROWSE_SEQUENTIAL}
                    element={
                      <MovieCollectionLayout
                        showBrowseControls
                        renderPageHeader
                      />
                    }
                  >
                    <Route index element={<BrowseSequential />} />
                  </Route>
                )}

                {/* Search results with shared layout (title in GridHeader) */}
                <Route
                  path={ROUTES.SEARCH_RESULTS}
                  element={
                    <MovieCollectionLayout
                      showBrowseControls={false}
                      renderPageHeader={false}
                    />
                  }
                >
                  <Route index element={<SearchResults />} />
                </Route>
                <Route path={ROUTES.MOVIE_DETAIL} element={<MovieDetail />} />
                {TypographyDebug && (
                  <Route
                    path={ROUTES.TYPOGRAPHY_TEST}
                    element={<TypographyDebug />}
                  />
                )}
                {ThemeDebug && (
                  <Route path="/dev/theme-debug" element={<ThemeDebug />} />
                )}
                {LayoutDebug && (
                  <Route path="/dev/layout-debug" element={<LayoutDebug />} />
                )}
                {/* System pages */}
                <Route path="/forbidden" element={<Forbidden />} />
                {/* Catch-all 404 route - must be last */}
                <Route path="*" element={<NotFound />} />
              </Route>

              {TestLogin && (
                <Route element={<ProtectedRoute />}>
                  <Route path={ROUTES.TEST_LOGIN} element={<TestLogin />} />
                </Route>
              )}
            </Routes>
          </Suspense>
        </AuthContextProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
