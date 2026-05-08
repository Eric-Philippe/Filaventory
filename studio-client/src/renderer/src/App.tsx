import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Dataset from "./pages/Dataset";
import Wishlist from "./pages/Wishlist";
import Projects from "./pages/Projects";
import Calculator from "./pages/Calculator";
import Settings from "./pages/Settings";
import Account from "./pages/Account";
import ServerSetup from "./pages/ServerSetup";

function ServerRoute({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const serverUrl = localStorage.getItem("serverUrl");
  return serverUrl ? <>{children}</> : <Navigate to="/setup" replace />;
}

function PrivateRoute({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const serverUrl = localStorage.getItem("serverUrl");
  if (!serverUrl) return <Navigate to="/setup" replace />;
  const token = localStorage.getItem("token");
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/setup" element={<ServerSetup />} />
      <Route
        path="/login"
        element={
          <ServerRoute>
            <Login />
          </ServerRoute>
        }
      />
      <Route
        path="/register"
        element={
          <ServerRoute>
            <Register />
          </ServerRoute>
        }
      />
      <Route
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      >
        <Route index element={<Inventory />} />
        <Route path="dataset" element={<Dataset />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="projects" element={<Projects />} />
        <Route path="calculator" element={<Calculator />} />
        <Route path="settings" element={<Settings />} />
        <Route path="account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
