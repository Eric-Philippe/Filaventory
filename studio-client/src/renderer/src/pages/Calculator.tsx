import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function FormulaToken({
  children,
  tooltip,
  accent,
  value,
  sym,
}: {
  children: React.ReactNode;
  tooltip: string;
  accent: string;
  value?: number;
  sym: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`px-2 py-1 rounded-lg font-mono text-sm cursor-help transition-all border ${accent} ${
          hovered ? "brightness-125" : ""
        }`}
      >
        {children}
      </span>

      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-52 pointer-events-none z-50"
          >
            <div className="bg-[#12132a] border border-white/20 rounded-xl px-3 py-2.5 shadow-2xl">
              <p className="text-white/80 text-xs leading-relaxed">{tooltip}</p>
              {value !== undefined && (
                <p className={`text-xs font-semibold mt-1.5 tabular-nums`}>
                  = {sym}
                  {value.toFixed(2)}
                </p>
              )}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-white/20" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

export default function Calculator(): React.ReactElement {
  const [form, setForm] = useState({
    filamentPricePerKg: "",
    filamentWeightG: "",
    printPlateCount: "",
    hoursSpent: "",
  });

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const pricePerKg = parseFloat(form.filamentPricePerKg) || 0;
  const weightG = parseFloat(form.filamentWeightG) || 0;
  const plates = parseFloat(form.printPlateCount) || 0;
  const hours = parseFloat(form.hoursSpent) || 0;

  const baseFee = 5;
  const filamentCost = pricePerKg * (weightG / 1000);
  const plateCost = plates * 4;
  const labourCost = hours;
  const total = baseFee + filamentCost + plateCost + labourCost;

  const hasInput = pricePerKg || weightG || plates || hours;

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") ?? "{}");
    } catch {
      return {};
    }
  })();
  const currency = user.currency || "USD";
  const sym: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
  };
  const s = sym[currency] ?? currency;

  const segments = [
    {
      label: "Base fee",
      value: baseFee,
      color: "bg-white/30",
      dot: "bg-white/60",
    },
    {
      label: "Filament",
      value: filamentCost,
      color: "bg-vibrant-orange",
      dot: "bg-vibrant-orange",
    },
    {
      label: "Plates",
      value: plateCost,
      color: "bg-light-blue",
      dot: "bg-light-blue",
    },
    {
      label: "Labour",
      value: labourCost,
      color: "bg-vibrant-green",
      dot: "bg-vibrant-green",
    },
  ];

  const inputs = [
    {
      key: "filamentPricePerKg" as const,
      label: `Filament price / kg`,
      placeholder: "25",
      unit: s,
      hint: "e.g. cost of a 1 kg spool",
    },
    {
      key: "filamentWeightG" as const,
      label: "Filament used",
      placeholder: "120",
      unit: "g",
      hint: "Total grams consumed for this job",
    },
    {
      key: "printPlateCount" as const,
      label: "Print plates",
      placeholder: "3",
      unit: "plates",
      hint: `Each plate adds ${s}4`,
    },
    {
      key: "hoursSpent" as const,
      label: "Hours spent",
      placeholder: "2",
      unit: "h",
      hint: `Each hour adds ${s}1`,
    },
  ];

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-white">Calculator</h1>
          <p className="text-white/40 text-sm mt-0.5">
            Estimate print job cost
          </p>
        </div>

        {/* Interactive formula */}
        <div className="glass rounded-2xl p-5">
          <p className="text-white/30 text-xs uppercase tracking-wider mb-4">
            Formula — hover each term
          </p>
          <div className="flex flex-wrap items-center gap-2 select-none">
            <span className="text-white/50 text-sm font-mono">Total =</span>

            <FormulaToken
              accent="border-white/20 bg-white/8 text-white/70"
              tooltip="Fixed base fee charged on every job, regardless of size or complexity."
              value={baseFee}
              sym={s}
            >
              {s}5
            </FormulaToken>

            <span className="text-white/30 font-mono">+</span>

            <FormulaToken
              accent="border-vibrant-orange/40 bg-vibrant-orange/10 text-vibrant-orange"
              tooltip="Actual material cost: filament price per kg multiplied by how many kg your print consumes."
              value={filamentCost}
              sym={s}
            >
              price/kg × weight_kg
            </FormulaToken>

            <span className="text-white/30 font-mono">+</span>

            <FormulaToken
              accent="border-light-blue/40 bg-light-blue/10 text-light-blue"
              tooltip={`Wear and energy cost per print plate used. Each plate costs ${s}4.`}
              value={plateCost}
              sym={s}
            >
              plates × {s}4
            </FormulaToken>

            <span className="text-white/30 font-mono">+</span>

            <FormulaToken
              accent="border-vibrant-green/40 bg-vibrant-green/10 text-vibrant-green"
              tooltip={`Your time. Each hour of labour costs ${s}1. Adjust this to match your rate.`}
              value={labourCost}
              sym={s}
            >
              hours
            </FormulaToken>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Inputs */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <p className="text-white/30 text-xs uppercase tracking-wider">
              Project details
            </p>
            {inputs.map(({ key, label, placeholder, unit, hint }) => (
              <div key={key}>
                <label className="flex items-center justify-between mb-1.5">
                  <span className="text-white/60 text-xs">{label}</span>
                  <span className="text-white/25 text-xs">{hint}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form[key]}
                    onChange={set(key)}
                    placeholder={placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 pr-12 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30 placeholder-white/15"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">
                    {unit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Result */}
          <div className="space-y-4">
            {/* Total */}
            <div className="glass rounded-2xl p-5 relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 60% at 50% 120%, rgba(16,185,129,0.1) 0%, transparent 70%)",
                }}
              />
              <p className="text-white/30 text-xs uppercase tracking-wider mb-3">
                Estimated total
              </p>
              <motion.p
                key={total.toFixed(2)}
                initial={{ opacity: 0.6, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="text-5xl font-bold text-white tabular-nums"
              >
                {s}
                {hasInput ? total.toFixed(2) : "0.00"}
              </motion.p>
              <p className="text-white/25 text-xs mt-2">{currency}</p>
            </div>

            {/* Proportional bar */}
            {total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5 space-y-4"
              >
                <p className="text-white/30 text-xs uppercase tracking-wider">
                  Breakdown
                </p>

                {/* Stacked bar */}
                <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                  {segments.map((seg) =>
                    seg.value > 0 ? (
                      <motion.div
                        key={seg.label}
                        initial={{ flex: 0 }}
                        animate={{ flex: seg.value / total }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className={`${seg.color} rounded-full`}
                      />
                    ) : null,
                  )}
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  {segments.map((seg) => (
                    <div
                      key={seg.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${seg.dot}`} />
                        <span className="text-white/50 text-xs">
                          {seg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white/25 text-xs tabular-nums">
                          {total > 0
                            ? Math.round((seg.value / total) * 100)
                            : 0}
                          %
                        </span>
                        <span className="text-white/70 text-xs font-medium tabular-nums w-16 text-right">
                          {s}
                          {seg.value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
