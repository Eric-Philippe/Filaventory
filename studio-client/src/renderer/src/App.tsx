import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
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

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp < Date.now() / 1000;
  } catch {
    return true;
  }
}

function PrivateRoute({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const serverUrl = localStorage.getItem("serverUrl");
  if (!serverUrl) return <Navigate to="/setup" replace />;
  const token = localStorage.getItem("token");
  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App(): React.ReactElement {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (): void => navigate("/login", { replace: true });
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, [navigate]);

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
