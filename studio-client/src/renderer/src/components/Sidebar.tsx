import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { User } from "../api/client";
import logoUrl from "../assets/logo-nobackground.png";

const mainLinks = [
  { to: "/", label: "Inventory", icon: IconInventory },
  { to: "/dataset", label: "Dataset", icon: IconDataset },
  { to: "/wishlist", label: "Wishlist", icon: IconWishlist },
  { to: "/projects", label: "Projects", icon: IconProjects },
  { to: "/calculator", label: "Calculator", icon: IconCalculator },
];

const bottomLinks = [
  { to: "/account", label: "Account", icon: IconAccount },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

interface Props {
  user: User;
}

export default function Sidebar({ user }: Props): React.ReactElement {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
      isActive
        ? "bg-dark-teal/40 text-light-blue"
        : "text-white/50 hover:text-white/80 hover:bg-white/5"
    }`;

  return (
    <aside className="w-56 shrink-0 h-screen flex flex-col border-r border-white/8 bg-black/10 backdrop-blur-lg">
      {/* Logo */}
      <div className="px-3 py-6 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <img src={logoUrl} alt="" className="w-16 h-16" />
          <span className="text-white font-bold tracking-widest uppercase text-sm">
            Filaventory Studio
          </span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {mainLinks.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"} className={linkClass}>
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-light-blue" : "text-white/40"}`}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom links */}
      <div className="px-3 pb-2 space-y-0.5 border-t border-white/8 pt-3">
        {bottomLinks.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass}>
            {({ isActive }) => (
              <>
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-light-blue" : "text-white/40"}`}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/8">
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-dark-teal/50 border border-light-blue/30 flex items-center justify-center text-xs text-light-blue font-semibold uppercase">
            {user.username?.[0] ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs font-medium truncate">
              {user.username}
            </p>
            <button
              onClick={logout}
              className="text-white/30 text-xs hover:text-white/60 transition-colors"
            >
              Sign out
            </button>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}

function IconInventory({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"
      />
    </svg>
  );
}

function IconWishlist({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function IconProjects({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  );
}

function IconCalculator({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4a2 2 0 012-2h12a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 6h10v3H7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h2v2H7zM11 12h2v2H11zM15 12h2v2H15zM7 16h2v2H7zM11 16h2v2H11zM15 16h2v2H15z" />
    </svg>
  );
}
function IconDataset({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 12h16M4 18h16"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6v12M16 6v12" />
    </svg>
  );
}
function IconAccount({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
