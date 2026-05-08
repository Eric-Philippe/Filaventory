import { useState } from "react";
import { Outlet } from "react-router-dom";
import type { User } from "../api/client";
import Sidebar from "../components/Sidebar";

export default function Dashboard(): React.ReactElement {
  const [user] = useState<User>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") ?? "{}") as User;
    } catch {
      return {} as User;
    }
  });

  return (
    <div className="h-screen bg-deep-purple flex overflow-hidden relative">
      {/* Subtle green ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 60% 70%, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0.04) 45%, transparent 70%)',
        }}
      />
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto relative">
        <Outlet />
      </div>
    </div>
  );
}
