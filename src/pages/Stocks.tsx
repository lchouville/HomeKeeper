import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Footer } from "../components/ui/Footer";
import { Header } from "../components/ui/Header";
import Sidebar from "../components/ui/Sidebar";
import { getCurrentUser, type AuthUser } from "../services/authService";
import { getUserHouseholds, type Household } from "../services/householdService";
import {
  addStock,
  updateStock,
  deleteStock,
  getStocks,
  type Stock,
} from "../services/stocksService";
import {
  getProduct,
  getProductByEan,
  addProduct as createProduct,
  type Product,
} from "../services/productsService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StockStatus = "overstock" | "in_stock" | "soon_to_buy" | "urgent_to_buy";

// Stock enrichi avec les données du produit associé
type EnrichedStock = Stock & {
  productName: string;
  unit: string;
  ean: string;
};

// Formulaire d'ajout : données produit + stock réunies
interface AddForm {
  // Produit
  ean: string;
  productName: string;
  unit: string;
  qtyPerPackage: number;
  // Stock
  qtyInStock: number;
  qtyNeeded: number;
  // Contrôle UI
  productExists: boolean;     // true = produit trouvé en base via EAN
  productId: string;          // id du produit trouvé ou créé
}

const EMPTY_ADD_FORM: AddForm = {
  ean: "",
  productName: "",
  unit: "",
  qtyPerPackage: 1,
  qtyInStock: 0,
  qtyNeeded: 1,
  productExists: false,
  productId: "",
};

// ---------------------------------------------------------------------------
// Helpers statut
// ---------------------------------------------------------------------------

const getStockStatus = (stock: Stock): StockStatus => {
  if (stock.qty_in_stock >= stock.qty_needed * 2) return "overstock";
  if (stock.qty_in_stock >= stock.qty_needed) return "in_stock";
  if (stock.qty_in_stock > 0) return "soon_to_buy";
  return "urgent_to_buy";
};

const STATUS_META: Record<StockStatus, { label: string; bg: string }> = {
  overstock:     { label: "Sur stock",           bg: "bg-green-500"  },
  in_stock:      { label: "En stock",             bg: "bg-blue-500"   },
  soon_to_buy:   { label: "À bientôt racheter",   bg: "bg-yellow-500" },
  urgent_to_buy: { label: "À racheter urgent",    bg: "bg-red-500"    },
};

// ---------------------------------------------------------------------------
// Hook : scan EAN via BarcodeDetector ou ZXing (fallback manuel)
// ---------------------------------------------------------------------------

function useBarcodeScanner(onDetected: (ean: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);

    // BarcodeDetector API (Chrome / Edge 83+)
    if (!("BarcodeDetector" in window)) {
      setError("La détection de code-barres n'est pas supportée par ce navigateur. Saisissez l'EAN manuellement.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScanning(true);

      // @ts-ignore — BarcodeDetector pas encore dans les types TS stables
      const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            onDetected(barcodes[0].rawValue);
            stop();
            return;
          }
        } catch {
          // frame pas prête
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      setScanning(false);
    }
  }, [onDetected, stop]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, scanning, error, start, stop };
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

function Stocks() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<string>("");

  // Stocks enrichis (stock + données produit fusionnées)
  const [enrichedStocks, setEnrichedStocks] = useState<EnrichedStock[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Édition inline ---
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<EnrichedStock | null>(null);

  // --- Formulaire d'ajout ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD_FORM);
  const [eanLookupStatus, setEanLookupStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");

  // --- Filtres & tri ---
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"productName" | "qty_in_stock" | "last_updated">("productName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ---------------------------------------------------------------------------
  // Scan EAN
  // ---------------------------------------------------------------------------

  const handleEanDetected = useCallback(
    async (ean: string) => {
      setAddForm((prev) => ({ ...prev, ean }));
      await lookupEan(ean);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { videoRef, scanning, error: scanError, start: startScan, stop: stopScan } =
    useBarcodeScanner(handleEanDetected);

  // ---------------------------------------------------------------------------
  // Lookup produit par EAN
  // ---------------------------------------------------------------------------

  const lookupEan = async (ean: string) => {
    if (!ean.trim()) return;
    setEanLookupStatus("loading");
    try {
      const results = await getProductByEan(ean.trim());
      if (results.length > 0) {
        const p = results[0];
        setAddForm((prev) => ({
          ...prev,
          ean,
          productName: p.name ?? p.productId,
          unit: p.unit,
          qtyPerPackage: p.qty,
          productId: p.productId,
          productExists: true,
        }));
        setEanLookupStatus("found");
      } else {
        setAddForm((prev) => ({
          ...prev,
          ean,
          productExists: false,
          productId: "",
          productName: "",
          unit: "",
          qtyPerPackage: 1,
        }));
        setEanLookupStatus("not_found");
      }
    } catch {
      setEanLookupStatus("not_found");
    }
  };

  // ---------------------------------------------------------------------------
  // Chargement foyer
  // ---------------------------------------------------------------------------

  const loadStocks = async (householdId: string) => {
    if (!householdId) return;
    setLoading(true);
    setSelectedHousehold(householdId);
    setCurrentPage(1);

    try {
      const stocks: Stock[] = await getStocks(householdId);

      // Enrichissement : on récupère le produit de chaque stock
      const enriched: EnrichedStock[] = await Promise.all(
        stocks.map(async (s) => {
          try {
            const products = await getProduct(s.productId);
            const p: Product | undefined = products[0];
            return {
              ...s,
              productName: p?.name ?? p?.productId ?? s.productId,
              unit: p?.unit ?? "",
              ean: p?.ean ?? "",
            };
          } catch {
            return { ...s, productName: s.productId, unit: "", ean: "" };
          }
        })
      );

      setEnrichedStocks(enriched);
    } catch (err) {
      console.error("Erreur chargement stocks :", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Ajout stock (+ création produit si nécessaire)
  // ---------------------------------------------------------------------------

  const handleAddStock = async () => {
    if (!selectedHousehold || !addForm.productName.trim()) return;

    try {
      let productId = addForm.productId;

      // Créer le produit s'il n'existe pas encore
      if (!addForm.productExists) {
        const newProduct = await createProduct({
          productId: "", // sera généré par la base
          name: addForm.productName.trim(),
          ean: addForm.ean.trim(),
          qty: addForm.qtyPerPackage,
          unit: addForm.unit.trim(),
          created_at: new Date().toISOString(),
        });
        productId = newProduct.productId;
      }

      await addStock(
        {
          householdId: selectedHousehold,
          productId,
          qty_in_stock: addForm.qtyInStock,
          qty_needed: addForm.qtyNeeded,
          last_updated: new Date().toISOString().split("T")[0],
        },
        selectedHousehold
      );

      setAddForm(EMPTY_ADD_FORM);
      setEanLookupStatus("idle");
      setShowAddForm(false);
      await loadStocks(selectedHousehold);
    } catch (err) {
      console.error("Erreur ajout stock :", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Édition inline
  // ---------------------------------------------------------------------------

  const getStockKey = (s: Stock) => `${s.householdId}-${s.productId}`;

  const startEditing = (s: EnrichedStock) => {
    setEditingKey(getStockKey(s));
    setEditStock({ ...s });
  };

  const saveEditing = async () => {
    if (!editStock) return;
    try {
      await updateStock(editStock);
      await loadStocks(selectedHousehold);
      setEditingKey(null);
      setEditStock(null);
    } catch (err) {
      console.error("Erreur sauvegarde :", err);
    }
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditStock(null);
  };

  const handleDeleteStock = async (s: EnrichedStock) => {
    if (!confirm(`Supprimer "${s.productName}" du stock ?`)) return;
    try {
      await deleteStock(s);
      await loadStocks(selectedHousehold);
    } catch (err) {
      console.error("Erreur suppression :", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Filtres & tri
  // ---------------------------------------------------------------------------

  const filteredStocks = useMemo(() => {
    let result = [...enrichedStocks];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.productName.toLowerCase().includes(term) ||
          s.ean.includes(term)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((s) => getStockStatus(s) === statusFilter);
    }

    result.sort((a, b) => {
      let va: string | number, vb: string | number;
      if (sortBy === "productName") {
        va = a.productName.toLowerCase();
        vb = b.productName.toLowerCase();
      } else if (sortBy === "qty_in_stock") {
        va = a.qty_in_stock;
        vb = b.qty_in_stock;
      } else {
        va = new Date(a.last_updated).getTime();
        vb = new Date(b.last_updated).getTime();
      }
      if (va < vb) return sortOrder === "asc" ? -1 : 1;
      if (va > vb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [enrichedStocks, searchTerm, statusFilter, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredStocks.length / ITEMS_PER_PAGE);
  const paginatedStocks = filteredStocks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        if (!currentUser) return;

        const userHouseholds = (await getUserHouseholds(currentUser.id)).flat();
        setHouseholds(userHouseholds);

        if (userHouseholds.length > 0) {
          loadStocks(userHouseholds[0].id);
        }
      } catch (err) {
        console.error("Erreur init :", err);
      }
    })();
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="h-screen flex flex-col">
      <Header page="Stocks" user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="flex flex-1 overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="flex flex-1 flex-col bg-[var(--bg-200)] p-4 md:p-6 overflow-auto">
          <h1 className="text-white text-xl font-semibold mb-4">Gestion des Stocks</h1>

          {/* Sélecteur de foyer */}
          <div className="mb-4">
            <label className="text-white block mb-2">Sélectionnez un foyer :</label>
            <select
              className="rounded bg-[var(--bg-700)] text-white p-2 w-full max-w-xs"
              value={selectedHousehold}
              onChange={(e) => loadStocks(e.target.value)}
            >
              <option value="">— Choisir un foyer —</option>
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Barre de filtres */}
          <div className="mb-4 bg-[var(--bg-700)] p-4 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-white block mb-1">Rechercher</label>
                <input
                  type="text"
                  placeholder="Nom ou EAN..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                />
              </div>
              <div>
                <label className="text-white block mb-1">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as StockStatus | "all"); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                >
                  <option value="all">Tous les statuts</option>
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white block mb-1">Trier par</label>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                >
                  <option value="productName">Nom du produit</option>
                  <option value="qty_in_stock">Quantité en stock</option>
                  <option value="last_updated">Date de mise à jour</option>
                </select>
              </div>
              <div>
                <label className="text-white block mb-1">Ordre</label>
                <select
                  value={sortOrder}
                  onChange={(e) => { setSortOrder(e.target.value as "asc" | "desc"); setCurrentPage(1); }}
                  className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                >
                  <option value="asc">Croissant</option>
                  <option value="desc">Décroissant</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bouton ajouter */}
          {!showAddForm && (
            <button
              onClick={() => { setShowAddForm(true); setAddForm(EMPTY_ADD_FORM); setEanLookupStatus("idle"); }}
              className="mb-4 bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600 w-fit"
            >
              ➕ Ajouter un produit
            </button>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Formulaire d'ajout                                               */}
          {/* ---------------------------------------------------------------- */}
          {showAddForm && (
            <div className="mb-6 bg-[var(--bg-700)] p-4 rounded-lg">
              <h2 className="text-white font-semibold mb-4">Nouveau produit au stock</h2>

              {/* --- EAN + scan --- */}
              <div className="mb-4">
                <label className="text-gray-400 text-sm block mb-1">Code EAN</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex : 3017620422003"
                    value={addForm.ean}
                    onChange={(e) => setAddForm((p) => ({ ...p, ean: e.target.value }))}
                    onBlur={(e) => lookupEan(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                  />
                  <button
                    type="button"
                    onClick={scanning ? stopScan : startScan}
                    className={`px-3 py-2 rounded text-white text-sm font-medium ${
                      scanning ? "bg-red-500 hover:bg-red-600" : "bg-indigo-500 hover:bg-indigo-600"
                    }`}
                  >
                    {scanning ? "⏹ Arrêter" : "📷 Scanner"}
                  </button>
                </div>

                {/* Feedback lookup */}
                {eanLookupStatus === "loading" && (
                  <p className="text-gray-400 text-xs mt-1">Recherche du produit…</p>
                )}
                {eanLookupStatus === "found" && (
                  <p className="text-green-400 text-xs mt-1">✅ Produit trouvé — champs pré-remplis.</p>
                )}
                {eanLookupStatus === "not_found" && (
                  <p className="text-yellow-400 text-xs mt-1">⚠️ Produit inconnu — remplissez les informations ci-dessous.</p>
                )}
                {scanError && (
                  <p className="text-red-400 text-xs mt-1">⚠️ {scanError}</p>
                )}
              </div>

              {/* Viewfinder caméra */}
              {scanning && (
                <div className="mb-4 rounded overflow-hidden border-2 border-indigo-500">
                  <video
                    ref={videoRef}
                    className="w-full max-h-48 object-cover"
                    muted
                    playsInline
                  />
                  <p className="text-center text-indigo-300 text-xs py-1 bg-black/40">
                    Pointez la caméra vers le code-barres
                  </p>
                </div>
              )}

              {/* --- Infos produit --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-2">
                  <label className="text-gray-400 text-sm block mb-1">
                    Nom du produit <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex : Pâtes spaghetti 500g"
                    value={addForm.productName}
                    disabled={addForm.productExists}
                    onChange={(e) => setAddForm((p) => ({ ...p, productName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Unité</label>
                  <input
                    type="text"
                    placeholder="Ex : kg, L, pièce"
                    value={addForm.unit}
                    disabled={addForm.productExists}
                    onChange={(e) => setAddForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Qté / unité d'achat</label>
                  <input
                    type="number"
                    min={0}
                    value={addForm.qtyPerPackage}
                    disabled={addForm.productExists}
                    onChange={(e) => setAddForm((p) => ({ ...p, qtyPerPackage: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded disabled:opacity-50"
                  />
                </div>
              </div>

              {/* --- Infos stock --- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Quantité actuellement en stock</label>
                  <input
                    type="number"
                    min={0}
                    value={addForm.qtyInStock}
                    onChange={(e) => setAddForm((p) => ({ ...p, qtyInStock: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Quantité souhaitée (seuil)</label>
                  <input
                    type="number"
                    min={1}
                    value={addForm.qtyNeeded}
                    onChange={(e) => setAddForm((p) => ({ ...p, qtyNeeded: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddStock}
                  disabled={!addForm.productName.trim()}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  ✅ Enregistrer
                </button>
                <button
                  onClick={() => { setShowAddForm(false); stopScan(); }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  ✖️ Annuler
                </button>
              </div>
            </div>
          )}

          {/* Légende */}
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(STATUS_META).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${v.bg}`} />
                <span className="text-white text-sm">{v.label}</span>
              </div>
            ))}
          </div>

          {/* Liste des stocks */}
          {loading ? (
            <div className="text-center py-10 text-gray-400">Chargement…</div>
          ) : (
            <div className="space-y-4">
              {filteredStocks.length === 0 ? (
                <div className="text-center py-6 text-gray-400">Aucun produit trouvé</div>
              ) : (
                <>
                  {paginatedStocks.map((stock) => {
                    const key = getStockKey(stock);
                    const isEditing = editingKey === key;
                    const status = getStockStatus(stock);
                    const meta = STATUS_META[status];
                    console.log("Rendering stock", stock, "status:", status);
                    return (
                      <div key={key} className="bg-[var(--bg-700)] rounded-lg p-4 relative">
                        {/* Badge statut */}
                        <div className={`absolute top-2 right-2 px-2 py-1 text-xs rounded-full text-white ${meta.bg}`}>
                          {meta.label}
                        </div>

                        {isEditing && editStock ? (
                          /* ---- Mode édition ---- */
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="md:col-span-2">
                                <label className="text-gray-400 text-sm block mb-1">Produit</label>
                                {/* Le nom du produit n'est pas modifiable ici — il faut passer par la gestion produit */}
                                <p className="text-white font-medium py-2">{editStock.productName}</p>
                              </div>
                              <div>
                                <label className="text-gray-400 text-sm block mb-1">En stock</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={editStock.qty_in_stock}
                                  onChange={(e) => setEditStock({ ...editStock, qty_in_stock: Number(e.target.value) })}
                                  className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                                />
                              </div>
                              <div>
                                <label className="text-gray-400 text-sm block mb-1">Nécessaire</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={editStock.qty_needed}
                                  onChange={(e) => setEditStock({ ...editStock, qty_needed: Number(e.target.value) })}
                                  className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={saveEditing} className="bg-green-500 text-white px-4 py-2 rounded flex-1 hover:bg-green-600">
                                ✅ Sauvegarder
                              </button>
                              <button onClick={cancelEditing} className="bg-gray-500 text-white px-4 py-2 rounded flex-1 hover:bg-gray-600">
                                ✖️ Annuler
                              </button>
                            </div>
                          </>
                        ) : (
                          /* ---- Mode affichage ---- */
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pr-24">
                              <div>
                                <p className="text-gray-400 text-sm">Produit</p>
                                <p className="text-white font-medium">{stock.productName}</p>
                                {stock.ean && (
                                  <p className="text-gray-500 text-xs">{stock.ean}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">En stock</p>
                                <p className="text-white font-medium">
                                  {stock.qty_in_stock} {stock.unit}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">Nécessaire</p>
                                <p className="text-white font-medium">
                                  {stock.qty_needed} {stock.unit}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">Dernière MAJ</p>
                                <p className="text-white font-medium">
                                  {new Date(stock.last_updated).toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditing(stock)}
                                className="bg-blue-500 text-white px-4 py-2 rounded flex-1 flex items-center justify-center gap-2 hover:bg-blue-600"
                              >
                                ✏️ Éditer
                              </button>
                              <button
                                onClick={() => handleDeleteStock(stock)}
                                className="bg-red-500 text-white px-4 py-2 rounded flex-1 flex items-center justify-center gap-2 hover:bg-red-600"
                              >
                                🗑️ Supprimer
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <nav className="inline-flex rounded-md shadow">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 rounded-l-md border border-gray-600 bg-[var(--bg-700)] text-white disabled:opacity-50"
                        >
                          ← Précédent
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 border-t border-b border-gray-600 ${
                              currentPage === page
                                ? "bg-blue-500 text-white"
                                : "bg-[var(--bg-700)] text-white hover:bg-[var(--bg-500)]"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 rounded-r-md border border-gray-600 bg-[var(--bg-700)] text-white disabled:opacity-50"
                        >
                          Suivant →
                        </button>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Stocks;