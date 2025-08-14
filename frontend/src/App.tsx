import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";

import AuthServiceProvider from "./components/AuthServiceProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Browse from "./pages/Browse";
import Login from "./pages/Login";
import TestLogin from "./pages/TestLogin";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

const App: React.FC = () => {
	return (
		<BrowserRouter>
			<AuthServiceProvider>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/browse" element={<Browse />} />
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
				</Routes>
			</AuthServiceProvider>
		</BrowserRouter>
	);
};

export default App;
