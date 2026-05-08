import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Register(): React.ReactElement {
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const result = await api.auth.register(
        form.email,
        form.username,
        form.password,
      );
      setLoading(false);

      // @ts-ignore - We know this is correct based on our API client implementation
      localStorage.setItem("token", result?.data.token);
      // @ts-ignore - We know this is correct based on our API client implementation
      localStorage.setItem("user", JSON.stringify(result?.data.user));
      navigate("/", { replace: true });
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-deep-purple flex items-center justify-center p-4">
      {/* Background accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-vibrant-orange/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-vibrant-green/5 blur-3xl" />
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
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-2 h-8 bg-vibrant-orange rounded-full" />
              <div className="w-2 h-5 bg-light-blue rounded-full" />
              <div className="w-2 h-6 bg-vibrant-green rounded-full" />
            </div>
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
          <h2 className="text-lg font-semibold text-white mb-6">
            Create account
          </h2>

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
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={set("username")}
                placeholder="printmaster"
                required
                maxLength={50}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Confirm password
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
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
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </motion.button>
          </form>

          <p className="text-white/30 text-sm text-center mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-light-blue hover:text-light-blue/80 transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
