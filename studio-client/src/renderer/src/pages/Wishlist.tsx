import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api, type WishlistItem } from "../api/client";
import Modal from "../components/Modal";
import WishlistForm from "../components/forms/WishlistForm";

const PRIORITY_LABEL: Record<number, { label: string; cls: string }> = {
  1: { label: "High", cls: "bg-vibrant-orange/20 text-vibrant-orange" },
  0: { label: "Normal", cls: "bg-white/10 text-white/60" },
  [-1]: { label: "Low", cls: "bg-white/5 text-white/30" },
};

export default function Wishlist(): React.ReactElement {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => api.wishlist.list(),
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) => api.wishlist.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const totalPrice = items.reduce((sum, i) => {
    if (!i.desired_price) return sum;
    return sum + i.desired_price * i.quantity_spools;
  }, 0);

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") ?? "{}");
    } catch {
      return {};
    }
  })();
  const currency = user.currency || "USD";
  const currencySymbol: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
  };
  const sym = currencySymbol[currency] ?? currency;

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Wishlist</h1>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-vibrant-orange hover:bg-vibrant-orange/90 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span className="text-lg leading-none">+</span> Add to wishlist
        </button>
      </div>

      {/* Summary cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Items", value: items.length, accent: "bg-light-blue" },
            {
              label: "Total spools",
              value: items
                .reduce((s, i) => s + i.quantity_spools, 0)
                .toFixed(1),
              accent: "bg-vibrant-green",
            },
            {
              label: "Est. budget",
              value: totalPrice > 0 ? `${sym}${totalPrice.toFixed(2)}` : "—",
              accent: "bg-vibrant-orange",
            },
          ].map((c) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className={`w-1 h-8 ${c.accent} rounded-full`} />
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">
                  {c.label}
                </p>
                <p className="text-white font-semibold text-lg">{c.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-white/15 border-t-light-blue rounded-full"
          />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-white/30 text-sm">Your wishlist is empty.</p>
          <button
            onClick={() => setAddOpen(true)}
            className="mt-3 text-light-blue text-sm hover:text-light-blue/70 transition-colors"
          >
            Add a filament
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_80px_80px_80px_100px] gap-4 px-4 py-2 text-white/30 text-xs uppercase tracking-wider">
            <div className="w-12" />
            <div>Filament</div>
            <div>Qty</div>
            <div>Price</div>
            <div>Priority</div>
            <div />
          </div>
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div
                key={item.id_wish}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className="grid grid-cols-[auto_1fr_80px_80px_80px_100px] gap-4 items-center px-4 py-3 glass rounded-xl"
              >
                {/* Image or color swatch */}
                {item.filament?.image_url ? (
                  <img
                    src={item.filament.image_url}
                    alt={item.filament.title}
                    className="w-12 h-12 rounded-lg border border-white/15 object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-lg border border-white/15 shrink-0 flex items-end justify-end p-1"
                    style={{
                      backgroundColor: item.filament?.color_hex ?? "#808080",
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                      style={{
                        backgroundColor: item.filament?.color_hex ?? "#808080",
                      }}
                    />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">
                    {item.filament?.title ?? "—"}
                  </p>
                  <p className="text-white/40 text-xs">
                    {item.filament?.brand?.name} ·{" "}
                    {item.filament?.material_type}
                  </p>
                  {item.purchase_url && (
                    <a
                      href={item.purchase_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-light-blue text-xs hover:underline truncate block max-w-xs"
                    >
                      {item.purchase_url}
                    </a>
                  )}
                </div>

                <span className="text-white/70 text-sm">
                  {item.quantity_spools}×
                </span>

                <span className="text-white/70 text-sm">
                  {item.desired_price ? `${sym}${item.desired_price}` : "—"}
                </span>

                <span
                  className={`inline-flex items-center justify-self-center text-xs px-2 py-1 rounded-full ${PRIORITY_LABEL[item.priority]?.cls ?? ""}`}
                >
                  {PRIORITY_LABEL[item.priority]?.label ?? "Normal"}
                </span>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setEditItem(item)}
                    className="text-xs text-white/40 hover:text-white/80 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Remove from wishlist?"))
                        deleteItem.mutate(item.id_wish);
                    }}
                    className="text-xs text-vibrant-orange/50 hover:text-vibrant-orange transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add to wishlist"
        width="max-w-2xl"
      >
        <WishlistForm onDone={() => setAddOpen(false)} />
      </Modal>
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit wishlist item"
        width="max-w-2xl"
      >
        <WishlistForm item={editItem} onDone={() => setEditItem(null)} />
      </Modal>
    </div>
  );
}
