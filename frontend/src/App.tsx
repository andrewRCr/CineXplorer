import {
	createBrowserRouter,
	createRoutesFromElements,
	Route,
	RouterProvider,
} from "react-router-dom";
import "./App.css";

// import { AuthServiceProvider } from "./contexts/AuthContext";
import AuthServiceProvider from "./components/AuthServiceProvider";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Login from "./pages/Login";

const router = createBrowserRouter(
	createRoutesFromElements(
		<Route>
			<Route path="/" element={<Home />} />
			<Route path="/browse" element={<Browse />} />
			<Route path="/login" element={<Login />} />
		</Route>
	)
);

const App: React.FC = () => {
	return (
		<AuthServiceProvider>
			<RouterProvider router={router} />
		</AuthServiceProvider>
	);
};

export default App;
