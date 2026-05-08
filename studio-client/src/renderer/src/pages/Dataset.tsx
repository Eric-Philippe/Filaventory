import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api, type Brand, type Filament, type User } from "../api/client";
import Modal from "../components/Modal";

const PAGE_SIZE = 50;

const fmtWeight = (g: number) =>
  g >= 1000 ? `${+(g / 1000).toFixed(2)}kg` : `${g}g`;

const emptyForm = {
  title: "",
  color_hex: "#ffffff",
  material_type: "",
  weight_grams: "1000",
  nozzle_temp_min: "",
  nozzle_temp_max: "",
  bed_temp_min: "",
  bed_temp_max: "",
  dry_temp: "",
  dry_time: "",
  image_url: "",
  brand_id: "",
  new_brand_name: "",
  new_brand_website: "",
};

type FormState = typeof emptyForm;

export default function Dataset(): React.ReactElement {
  const qc = useQueryClient();
  const user = useMemo<User>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") ?? "{}") as User;
    } catch {
      return {} as User;
    }
  }, []);

  const [filters, setFilters] = useState({
    q: "",
    materials: [] as string[],
    brand_id: "",
  });
  const [materialInput, setMaterialInput] = useState("");
  const [page, setPage] = useState(1);
  const [selectedFilament, setSelectedFilament] = useState<Filament | null>(
    null,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");

  type SortKey = "title" | "brand" | "material" | "nozzle" | "bed" | "weight";
  const [sortBy, setSortBy] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const materialsQuery = useQuery({
    queryKey: ["materials"],
    queryFn: () => api.filaments.materials(),
    staleTime: 60_000,
  });

  const brandsQuery = useQuery({
    queryKey: ["brands"],
    queryFn: () => api.brands.list({ per_page: 500 }),
    staleTime: 30_000,
  });

  const filamentsQuery = useQuery({
    queryKey: ["dataset", filters, page, sortBy, sortDir],
    queryFn: () =>
      api.filaments.list({
        q: filters.q || undefined,
        materials: filters.materials.length ? filters.materials : undefined,
        brand_id: filters.brand_id || undefined,
        page,
        per_page: PAGE_SIZE,
        sort_by: sortBy ?? undefined,
        sort_dir: sortBy ? sortDir : undefined,
      }),
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setPage(1);
  }, [
    filters.q,
    filters.materials.join(","),
    filters.brand_id,
    sortBy,
    sortDir,
  ]);

  const filaments = filamentsQuery.data ?? {
    data: [],
    total: 0,
    page: 1,
    per_page: PAGE_SIZE,
  };
  const brands = brandsQuery.data?.data ?? [];
  const materials = materialsQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil(filaments.total / PAGE_SIZE));
  const isOwn = selectedFilament?.id_origin === user.id_user;

  const sortedFilaments: Filament[] = filamentsQuery.data?.data ?? [];

  const setFilter =
    (key: "q" | "brand_id") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const addMaterial = (value: string) => {
    const material = value.trim();
    if (!material) return;
    setFilters((prev) => {
      if (prev.materials.includes(material)) return prev;
      return { ...prev, materials: [...prev.materials, material] };
    });
    setMaterialInput("");
  };

  const removeMaterial = (material: string) => {
    setFilters((prev) => ({
      ...prev,
      materials: prev.materials.filter((item) => item !== material),
    }));
  };

  const setFormField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const resetForm = () => {
    setForm(emptyForm);
    setError("");
  };

  const createFilamentMutation = useMutation({
    mutationFn: async () => {
      if (
        !form.title.trim() ||
        !form.material_type.trim() ||
        !form.brand_id.trim()
      ) {
        throw new Error("Title, material and brand are required");
      }
      let brandId = form.brand_id;
      if (brandId === "new") {
        if (!form.new_brand_name.trim()) {
          throw new Error("New brand name is required");
        }
        const brand = await api.brands.create({
          name: form.new_brand_name.trim(),
          website: form.new_brand_website?.trim() || undefined,
        });
        brandId = brand.id_brand;
      }
      const colorValue = form.color_hex.trim();
      if (!/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
        throw new Error("Color must be 6 hex chars, like #RRGGBB");
      }
      return api.filaments.create({
        title: form.title.trim(),
        color_hex: colorValue,
        weight_grams: Number(form.weight_grams) || 1000,
        image_url: form.image_url.trim() || undefined,
        material_type: form.material_type.trim(),
        density: 1.24,
        nozzle_temp_min: form.nozzle_temp_min
          ? Number(form.nozzle_temp_min)
          : undefined,
        nozzle_temp_max: form.nozzle_temp_max
          ? Number(form.nozzle_temp_max)
          : undefined,
        bed_temp_min: form.bed_temp_min ? Number(form.bed_temp_min) : undefined,
        bed_temp_max: form.bed_temp_max ? Number(form.bed_temp_max) : undefined,
        dry_temp: form.dry_temp ? Number(form.dry_temp) : undefined,
        dry_time: form.dry_time ? Number(form.dry_time) : undefined,
        id_brand: brandId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dataset"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
      setAddOpen(false);
      resetForm();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Unable to save filament");
    },
  });

  const deleteFilamentMutation = useMutation({
    mutationFn: (id: string) => api.filaments.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dataset"] });
      setSelectedFilament(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    createFilamentMutation.mutate();
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dataset</h1>
          <p className="text-white/40 text-sm mt-1">
            Browse the full filament dataset with filters, pagination, and
            details.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setAddOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-vibrant-orange hover:bg-vibrant-orange/90 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Add filament
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          {
            label: "Filaments",
            value: filaments.total,
            accent: "bg-light-blue",
          },
          {
            label: "Materials",
            value: materials.length,
            accent: "bg-vibrant-green",
          },
          {
            label: "Brands",
            value: brands.length,
            accent: "bg-vibrant-orange",
          },
        ].map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div className={`w-1 h-8 ${card.accent} rounded-full`} />
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-white font-semibold text-lg">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3 mb-6 items-start">
        {/* Search — icon stays vertically centered relative to input only */}
        <div className="md:col-span-1">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={filters.q}
              onChange={setFilter("q")}
              placeholder="Search dataset..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-11 pr-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
            />
          </div>
        </div>
        {/* Filter by material */}
        <div className="space-y-2">
          {filters.materials.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.materials.map((material) => (
                <button
                  key={material}
                  type="button"
                  onClick={() => removeMaterial(material)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
                >
                  {material} ×
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            list="material-options"
            value={materialInput}
            onChange={(e) => setMaterialInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMaterial(materialInput);
              }
            }}
            placeholder="Filter by material..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
          />
          <datalist id="material-options">
            {materials.map((material) => (
              <option key={material} value={material} />
            ))}
          </datalist>
        </div>
        <div>
          <select
            value={filters.brand_id}
            onChange={setFilter("brand_id")}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
          >
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand.id_brand} value={brand.id_brand}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
        {/* Sortable header */}
        {(() => {
          const cols = "grid-cols-[3rem_3rem_2fr_1.2fr_1fr_1fr_1fr_0.8fr]";
          const SortBtn = ({
            k,
            label,
            right,
          }: {
            k: SortKey;
            label: string;
            right?: boolean;
          }) => (
            <button
              type="button"
              onClick={() => toggleSort(k)}
              className={`flex items-center gap-1 text-xs uppercase tracking-wider transition-colors ${
                sortBy === k
                  ? "text-light-blue"
                  : "text-white/40 hover:text-white/70"
              } ${right ? "justify-end w-full" : ""}`}
            >
              {label}
              {sortBy === k && (
                <span className="text-[10px]">
                  {sortDir === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
          );
          return (
            <div
              className={`grid ${cols} gap-3 px-4 py-3 border-b border-white/10`}
            >
              <div className="text-white/40 text-xs uppercase tracking-wider">
                #
              </div>
              <div className="text-white/40 text-xs uppercase tracking-wider">
                Img
              </div>
              <SortBtn k="title" label="Filament" />
              <SortBtn k="brand" label="Brand" />
              <SortBtn k="material" label="Material" />
              <SortBtn k="nozzle" label="Nozzle" />
              <SortBtn k="bed" label="Bed" />
              <SortBtn k="weight" label="Weight" right />
            </div>
          );
        })()}
        {filamentsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-white/15 border-t-light-blue rounded-full"
            />
          </div>
        ) : sortedFilaments.length === 0 ? (
          <div className="py-20 text-center text-white/40">
            No filaments found.
          </div>
        ) : (
          <div className="space-y-1">
            {sortedFilaments.map((filament, idx) => (
              <button
                key={filament.id_filament}
                type="button"
                onClick={() => setSelectedFilament(filament)}
                className="w-full grid grid-cols-[3rem_3rem_2fr_1.2fr_1fr_1fr_1fr_0.8fr] gap-3 items-center px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <div className="text-sm text-white/40">
                  {(page - 1) * PAGE_SIZE + idx + 1}
                </div>
                <div className="h-10 w-10 rounded-lg border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
                  {filament.image_url ? (
                    <img
                      src={filament.image_url}
                      alt={filament.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{ backgroundColor: filament.color_hex }}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">
                    {filament.title}
                  </p>
                  <p className="text-white/30 text-xs truncate">
                    {filament.color_hex}
                  </p>
                </div>
                <div className="text-white/70 text-sm truncate">
                  {filament.brand?.name ?? "—"}
                </div>
                <div className="text-white/70 text-sm truncate">
                  {filament.material_type}
                </div>
                <div className="text-white/60 text-sm">
                  {filament.nozzle_temp_min
                    ? `${filament.nozzle_temp_min}${filament.nozzle_temp_max ? `–${filament.nozzle_temp_max}` : ""}°`
                    : "—"}
                </div>
                <div className="text-white/60 text-sm">
                  {filament.bed_temp_min
                    ? `${filament.bed_temp_min}${filament.bed_temp_max ? `–${filament.bed_temp_max}` : ""}°`
                    : "—"}
                </div>
                <div className="text-right text-white/70 text-sm">
                  {fmtWeight(filament.weight_grams)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-white/40 text-sm">
          Showing {filaments.data.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
          {(page - 1) * PAGE_SIZE + filaments.data.length} of {filaments.total}{" "}
          filaments
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 disabled:opacity-40 disabled:cursor-not-allowed hover:border-white/20"
          >
            Previous
          </button>
          <span className="text-white/50 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 disabled:opacity-40 disabled:cursor-not-allowed hover:border-white/20"
          >
            Next
          </button>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add filament"
        width="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-vibrant-orange/90 bg-vibrant-orange/10 border border-vibrant-orange/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={setFormField("title")}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={form.color_hex}
                  onChange={setFormField("color_hex")}
                  placeholder="#RRGGBBAA"
                  maxLength={9}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
                />
                <label
                  className="h-12 w-12 rounded-lg border border-white/10 cursor-pointer relative overflow-hidden shrink-0"
                  style={{ backgroundColor: form.color_hex }}
                  title="Pick color"
                >
                  <input
                    type="color"
                    value={
                      form.color_hex.length === 7 ? form.color_hex : "#ffffff"
                    }
                    onChange={(e) =>
                      setFormField("color_hex")({
                        target: { value: e.target.value },
                      } as any)
                    }
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                Material
              </label>
              <input
                type="text"
                value={form.material_type}
                onChange={setFormField("material_type")}
                list="material-options"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
              />
              <datalist id="material-options">
                {materials.map((material) => (
                  <option key={material} value={material} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                Weight (grams)
              </label>
              <input
                type="number"
                value={form.weight_grams}
                onChange={setFormField("weight_grams")}
                min={1}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                Brand
              </label>
              <select
                value={form.brand_id}
                onChange={setFormField("brand_id")}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
              >
                <option value="">Select a brand...</option>
                <option value="new">+ Create new brand</option>
                {brands.map((brand) => (
                  <option key={brand.id_brand} value={brand.id_brand}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            {form.brand_id === "new" && (
              <>
                <div>
                  <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                    Brand name
                  </label>
                  <input
                    type="text"
                    value={form.new_brand_name}
                    onChange={setFormField("new_brand_name")}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                    Brand website
                  </label>
                  <input
                    type="url"
                    value={form.new_brand_website}
                    onChange={setFormField("new_brand_website")}
                    placeholder="https://"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
                  />
                </div>
              </>
            )}
            <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                  Nozzle min
                </label>
                <input
                  type="number"
                  value={form.nozzle_temp_min}
                  onChange={setFormField("nozzle_temp_min")}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/50 text-xs">
                  °C
                </span>
              </div>
              <div className="relative">
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                  Nozzle max
                </label>
                <input
                  type="number"
                  value={form.nozzle_temp_max}
                  onChange={setFormField("nozzle_temp_max")}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/50 text-xs">
                  °C
                </span>
              </div>
              <div className="relative">
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                  Bed min
                </label>
                <input
                  type="number"
                  value={form.bed_temp_min}
                  onChange={setFormField("bed_temp_min")}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/50 text-xs">
                  °C
                </span>
              </div>
              <div className="relative">
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                  Bed max
                </label>
                <input
                  type="number"
                  value={form.bed_temp_max}
                  onChange={setFormField("bed_temp_max")}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/50 text-xs">
                  °C
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                  Dry temp
                </label>
                <input
                  type="number"
                  value={form.dry_temp}
                  onChange={setFormField("dry_temp")}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/50 text-xs">
                  °C
                </span>
              </div>
              <div className="relative">
                <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                  Dry time
                </label>
                <input
                  type="number"
                  value={form.dry_time}
                  onChange={setFormField("dry_time")}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/50 text-xs">
                  h
                </span>
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-white/50 text-xs uppercase tracking-wider mb-1.5">
                Image URL (optional)
              </label>
              <input
                type="url"
                value={form.image_url}
                onChange={setFormField("image_url")}
                placeholder="https://"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-light-blue/50 focus:ring-1 focus:ring-light-blue/30"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="flex-1 py-2.5 rounded-lg border border-white/15 text-white/60 hover:text-white/80 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createFilamentMutation.isPending}
              className="flex-1 py-2.5 rounded-lg bg-vibrant-orange hover:bg-vibrant-orange/90 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {createFilamentMutation.isPending ? "Saving..." : "Save filament"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!selectedFilament}
        onClose={() => setSelectedFilament(null)}
        title={selectedFilament?.title ?? "Filament details"}
        width="max-w-2xl"
      >
        {selectedFilament && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Brand
                </p>
                <p className="text-white text-sm">
                  {selectedFilament.brand?.name ?? "—"}
                </p>
                {selectedFilament.brand?.website && (
                  <a
                    href={selectedFilament.brand.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-light-blue text-sm hover:underline"
                  >
                    {selectedFilament.brand.website}
                  </a>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Owner
                </p>
                <p className="text-white text-sm">
                  {selectedFilament.id_origin === user.id_user
                    ? "You"
                    : selectedFilament.id_origin
                      ? "Private"
                      : "Dataset"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Material
                </p>
                <p className="text-white text-sm">
                  {selectedFilament.material_type}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Weight
                </p>
                <p className="text-white text-sm">
                  {selectedFilament.weight_grams} g
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Nozzle temp
                </p>
                <p className="text-white text-sm">
                  {selectedFilament.nozzle_temp_min ?? "—"}
                  {selectedFilament.nozzle_temp_min &&
                  selectedFilament.nozzle_temp_max
                    ? `–${selectedFilament.nozzle_temp_max}°C`
                    : selectedFilament.nozzle_temp_min
                      ? "°C"
                      : ""}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Bed temp
                </p>
                <p className="text-white text-sm">
                  {selectedFilament.bed_temp_min ?? "—"}
                  {selectedFilament.bed_temp_min &&
                  selectedFilament.bed_temp_max
                    ? `–${selectedFilament.bed_temp_max}°C`
                    : selectedFilament.bed_temp_min
                      ? "°C"
                      : ""}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Dry
                </p>
                <p className="text-white text-sm">
                  {selectedFilament.dry_temp
                    ? `${selectedFilament.dry_temp}°C`
                    : "—"}
                  {selectedFilament.dry_time
                    ? ` · ${selectedFilament.dry_time} h`
                    : ""}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  Color
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm truncate">
                    {selectedFilament.color_hex}
                  </span>
                  <span
                    className="w-6 h-6 rounded-full border border-white/10"
                    style={{ backgroundColor: selectedFilament.color_hex }}
                  />
                </div>
              </div>
            </div>

            {selectedFilament.image_url && (
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                  Image
                </p>
                <img
                  src={selectedFilament.image_url}
                  alt={selectedFilament.title}
                  className="w-full rounded-2xl border border-white/10 object-cover"
                />
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-white/50 text-sm">
                Created at{" "}
                {new Date(selectedFilament.created_at).toLocaleDateString()}
              </p>
              {isOwn && (
                <button
                  onClick={() => {
                    if (window.confirm("Delete this filament?")) {
                      deleteFilamentMutation.mutate(
                        selectedFilament.id_filament,
                      );
                    }
                  }}
                  className="rounded-lg bg-vibrant-orange px-4 py-2 text-sm font-medium text-white hover:bg-vibrant-orange/90"
                >
                  Delete filament
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
