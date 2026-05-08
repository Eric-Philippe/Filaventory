import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { setServerUrl } from "../api/client";
import logoUrl from "../assets/logo-nobackground.png";

export default function ServerSetup(): React.ReactElement {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");

    let normalized = url.trim().replace(/\/$/, "");
    if (!normalized) {
      setError("Enter a server URL");
      return;
    }
    if (!/^https?:\/\//i.test(normalized)) normalized = `http://${normalized}`;

    setLoading(true);
    try {
      console.log(`Checking server health at ${normalized}/api/health...`);
      const res = await fetch(`${normalized}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      setServerUrl(normalized);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Cannot reach server: ${err.message}`
          : "Cannot reach server",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-deep-purple flex items-center justify-center p-4">
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
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <img
              src={logoUrl}
              alt="Filaventory Studio"
              className="w-24 h-24 mx-auto mb-3 drop-shadow-lg"
            />
            <h1 className="text-3xl font-bold tracking-widest text-white uppercase">
              Filaventory Studio
            </h1>
            <p className="text-white/40 text-sm mt-2 tracking-wide">
              Filament inventory management
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="glass rounded-2xl p-8"
        >
          <h2 className="text-lg font-semibold text-white mb-1">
            Connect to server
          </h2>
          <p className="text-white/40 text-sm mb-6">
            Enter the address of your Filaventory server.
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
                Server URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://192.168.1.100:8080"
                required
                autoFocus
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
                  Connecting...
                </span>
              ) : (
                "Connect"
              )}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
