import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { clearServerUrl } from "../api/client";
import logoUrl from "../assets/logo-nobackground.png";

const APP_VERSION = "1.0.0";

export default function Settings(): React.ReactElement {
  const navigate = useNavigate();
  const serverUrl =
    localStorage.getItem("serverUrl") ?? "http://localhost:8080";

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () =>
      fetch(`${serverUrl}/api/health`)
        .then((r) => r.json())
        .catch(() => null),
    staleTime: 30_000,
  });

  const rows: { label: string; value: string }[] = [
    { label: "App version", value: APP_VERSION },
    { label: "API status", value: health ? "Online" : "Offline" },
    { label: "Server URL", value: serverUrl },
  ];

  const handleChangeServer = (): void => {
    if (!window.confirm("Disconnect from this server? You will be signed out."))
      return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    clearServerUrl();
    navigate("/setup", { replace: true });
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <p className="text-white/40 text-sm mt-0.5">
            App info and configuration
          </p>
        </div>

        {/* Info table */}
        <div className="glass rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-white/50 text-xs uppercase tracking-wider">
              About
            </p>
          </div>
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center justify-between px-4 py-3 ${
                i < rows.length - 1 ? "border-b border-white/8" : ""
              }`}
            >
              <span className="text-white/50 text-sm">{row.label}</span>
              <span
                className={`text-sm font-medium ${
                  row.label === "API status"
                    ? health
                      ? "text-vibrant-green"
                      : "text-vibrant-orange"
                    : row.label === "Server URL"
                      ? "text-white/60 font-mono text-xs"
                      : "text-white/80"
                }`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Server */}
        <div className="glass rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-white/50 text-xs uppercase tracking-wider">
              Server
            </p>
          </div>
          <div className="px-4 py-3">
            <button
              onClick={handleChangeServer}
              className="text-sm text-vibrant-orange/80 hover:text-vibrant-orange transition-colors"
            >
              Change server / disconnect
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="glass rounded-xl overflow-hidden margin-top-4 mb-4">
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-white/50 text-xs uppercase tracking-wider">
              Links
            </p>
          </div>
          {[
            {
              label: "GitHub",
              href: "https://github.com/ericphlpp/filaventory",
              desc: "Source code",
            },
            {
              label: "Report a bug",
              href: "https://github.com/ericphlpp/filaventory/issues",
              desc: "Open an issue",
            },
          ].map((link, i, arr) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${
                i < arr.length - 1 ? "border-b border-white/8" : ""
              }`}
            >
              <div>
                <p className="text-white/80 text-sm">{link.label}</p>
                <p className="text-white/30 text-xs">{link.desc}</p>
              </div>
              <svg
                className="w-4 h-4 text-white/30"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          ))}
        </div>

        {/* About branding */}
        <div className="glass rounded-xl p-6 flex flex-col items-center text-center gap-3">
          <img
            src={logoUrl}
            alt="Filaventory Studio"
            className="w-16 h-16 drop-shadow-lg"
          />
          <div>
            <p className="text-white font-bold tracking-widest uppercase text-sm">
              Filaventory Studio
            </p>
            <p className="text-white/30 text-xs mt-0.5">
              Version {APP_VERSION}
            </p>
          </div>
          <p className="text-white/25 text-xs">
            Developed by <span className="text-white/50">Eric PHILIPPE</span>
          </p>
          <p className="text-white/15 text-xs">
            Copyright © 2026 · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
