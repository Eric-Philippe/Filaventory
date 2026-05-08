import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Filament } from "../api/client";

interface Props {
  value?: Filament | null;
  onChange: (f: Filament | null) => void;
  placeholder?: string;
}

export default function FilamentSearchInput({
  value,
  onChange,
  placeholder = "Search filaments...",
}: Props): React.ReactElement {
  const [query, setQuery] = useState(value?.title ?? "");
  const [results, setResults] = useState<Filament[]>([]);
  const [visible, setVisible] = useState(6);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number }>({
    top: 0, left: 0, width: 0,
  });
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(`${value.brand?.name ?? ""} — ${value.title}`);
  }, [value]);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (query.trim().length < 1) {
      setResults([]);
      setVisible(6);
      setPage(1);
      setTotal(0);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.filaments.list({ q: query, per_page: 12, page: 1 });
        setResults(res.data);
        setTotal(res.total);
        setPage(1);
        setVisible(6);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, [query]);

  // Recompute dropdown position whenever it opens or results change
  useEffect(() => {
    if (open && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }, [open, results.length]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleScroll = async () => {
    const el = listRef.current;
    if (!el || loading) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
    if (!nearBottom) return;

    if (visible < results.length) {
      setVisible((v) => Math.min(v + 6, results.length));
    } else if (results.length < total) {
      const nextPage = page + 1;
      setLoading(true);
      try {
        const res = await api.filaments.list({ q: query, per_page: 12, page: nextPage });
        setResults((prev) => [...prev, ...res.data]);
        setPage(nextPage);
        setVisible((v) => v + 6);
      } finally {
        setLoading(false);
      }
    }
  };

  const select = (f: Filament) => {
    onChange(f);
    setQuery(`${f.brand?.name ?? ""} — ${f.title}`);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setVisible(6);
    setPage(1);
    setTotal(0);
  };

  const dropdown = open && results.length > 0
    ? createPortal(
        <AnimatePresence>
          <motion.div
            ref={listRef}
            onScroll={handleScroll}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              top: dropPos.top,
              left: dropPos.left,
              width: dropPos.width,
              zIndex: 9999,
            }}
            className="bg-[#1a1b2e] border border-white/15 rounded-xl overflow-hidden shadow-2xl max-h-72 overflow-y-auto"
          >
            {results.slice(0, visible).map((f) => (
              <button
                key={f.id_filament}
                onMouseDown={(e) => { e.preventDefault(); select(f); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-b-0"
              >
                {f.image_url ? (
                  <img src={f.image_url} alt={f.title}
                    className="w-10 h-10 rounded-lg shrink-0 object-cover border border-white/15" />
                ) : (
                  <div className="w-10 h-10 rounded-lg shrink-0 border border-white/15"
                    style={{ backgroundColor: f.color_hex }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">{f.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {f.brand?.name} · {f.material_type}
                  </p>
                  {f.nozzle_temp_min && f.nozzle_temp_max && (
                    <p className="text-white/25 text-xs">
                      Nozzle {f.nozzle_temp_min}–{f.nozzle_temp_max}°C
                    </p>
                  )}
                </div>
                <div className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                  style={{ backgroundColor: f.color_hex }} />
              </button>
            ))}
            {(loading || visible < results.length || results.length < total) && (
              <div className="flex justify-center py-3">
                <motion.div animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/15 border-t-light-blue rounded-full" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) clear();
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 transition-all pr-10"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <motion.div animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-white/20 border-t-light-blue rounded-full" />
          </div>
        )}
        {value && !loading && (
          <button onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 text-lg">
            ×
          </button>
        )}
      </div>

      {dropdown}

      {value && (
        <div className="mt-2 flex items-center gap-3 px-3 py-2 bg-dark-teal/20 border border-dark-teal/30 rounded-lg">
          {value.image_url ? (
            <img src={value.image_url} alt={value.title}
              className="w-8 h-8 rounded shrink-0 object-cover border border-white/20" />
          ) : (
            <div className="w-4 h-4 rounded-full shrink-0 border border-white/20"
              style={{ backgroundColor: value.color_hex }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs truncate">
              {value.material_type} ·{" "}
              {value.nozzle_temp_min && value.nozzle_temp_max
                ? `${value.nozzle_temp_min}–${value.nozzle_temp_max}°C nozzle`
                : "No temp data"}
            </p>
          </div>
          {value.weight_grams && (
            <span className="text-white/40 text-xs">{value.weight_grams}g</span>
          )}
        </div>
      )}
    </div>
  );
}
