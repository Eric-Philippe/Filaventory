import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import logoUrl from "../assets/logo-nobackground.png";

export default function Login(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await api.auth.login(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.data) {
      localStorage.setItem("token", result.data.token);
      localStorage.setItem("user", JSON.stringify(result.data.user));
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-deep-purple flex items-center justify-center p-4">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-light-blue/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-vibrant-green/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <img src={logoUrl} alt="Filaventory Studio" className="w-24 h-24 mx-auto mb-3 drop-shadow-lg" />
            <h1 className="text-3xl font-bold tracking-widest text-white uppercase">
              Filaventory Studio
            </h1>
            <p className="text-white/40 text-sm mt-2 tracking-wide">
              Filament inventory management
            </p>
          </motion.div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="glass rounded-2xl p-8"
        >
          <h2 className="text-lg font-semibold text-white mb-1">Sign in</h2>
          <p className="text-white/30 text-xs mb-6 font-mono truncate">
            {localStorage.getItem('serverUrl') ?? ''}
          </p>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-vibrant-orange/15 border border-vibrant-orange/30 text-vibrant-orange text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-200"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.99 }}
              className="w-full bg-vibrant-orange hover:bg-vibrant-orange/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 mt-2 transition-colors duration-200 text-sm tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </motion.button>
          </form>

          <p className="text-white/30 text-sm text-center mt-6">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="text-light-blue hover:text-light-blue/80 transition-colors font-medium"
            >
              Create one
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
