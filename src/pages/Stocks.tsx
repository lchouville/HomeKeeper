import { useEffect, useState, useMemo } from "react";
import { Footer } from "../components/ui/Footer";
import { Header } from "../components/ui/Header";
import Sidebar from "../components/ui/Sidebar";
import { getCurrentUser, type AuthUser } from "../services/authService";
import { getUserHouseholds, type Household } from "../services/householdService";
import { addStock, updateStock, deleteStock, getStocks, type Stock } from "../services/stocksService";

// Types pour les états de stock
type StockStatus = 'overstock' | 'in_stock' | 'soon_to_buy' | 'urgent_to_buy';

function Stocks() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<string>("");
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<Stock | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Filtres et tri
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"product" | "qty_in_stock" | "last_updated">("product");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [newStock, setNewStock] = useState<Stock>({
    householdId: "",
    productId: "",
    qty_in_stock: 0,
    qty_needed: 0,
    last_updated: new Date().toISOString().split("T")[0],
  });

  const getStockKey = (stock: Stock) => `${stock.householdId}-${stock.productId}`;

  // Fonction pour déterminer l'état du stock
  const getStockStatus = (stock: Stock): StockStatus => {
    if (stock.qty_in_stock >= stock.qty_needed * 2) {
      return 'overstock';
    } else if (stock.qty_in_stock >= stock.qty_needed) {
      return 'in_stock';
    } else if (stock.qty_in_stock > 0 && stock.qty_in_stock < stock.qty_needed) {
      return 'soon_to_buy';
    } else {
      return 'urgent_to_buy';
    }
  };

  const getStatusLabel = (status: StockStatus) => {
    const labels = {
      overstock: "Sur stock",
      in_stock: "En stock",
      soon_to_buy: "À bientôt racheter",
      urgent_to_buy: "À racheter urgent"
    };
    return labels[status];
  };

  const getStatusClass = (status: StockStatus) => {
    const classes = {
      overstock: "bg-green-500",
      in_stock: "bg-blue-500",
      soon_to_buy: "bg-yellow-500",
      urgent_to_buy: "bg-red-500"
    };
    return classes[status];
  };

  const startEditing = (stock: Stock) => {
    const key = getStockKey(stock);
    setEditingKey(key);
    setEditStock({ ...stock });
  };

  const deleteStockLine = async (stock: Stock) => {
    try {
      await deleteStock(stock);
      await loadProducts(selectedHousehold);
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
    }
  };

  const saveEditing = async () => {
    if (!editStock) return;
    try {
      await updateStock(editStock);
      await loadProducts(selectedHousehold);
      setEditingKey(null);
      setEditStock(null);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde :", error);
    }
  };

  const cancelEditing = () => {
    setEditingKey(null);
    setEditStock(null);
  };

  // Filtrer et trier les stocks
  const filteredStocks = useMemo(() => {
    let result = [...allStocks];

    if (searchTerm) {
      result = result.filter(stock =>
        stock.productId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(stock => getStockStatus(stock) === statusFilter);
    }

    result.sort((a, b) => {
      let valueA, valueB;

      if (sortBy === "product") {
        valueA = a.productId.toLowerCase();
        valueB = b.productId.toLowerCase();
      } else if (sortBy === "qty_in_stock") {
        valueA = a.qty_in_stock;
        valueB = b.qty_in_stock;
      } else {
        valueA = new Date(a.last_updated).getTime();
        valueB = new Date(b.last_updated).getTime();
      }

      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [allStocks, searchTerm, statusFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
  const paginatedStocks = filteredStocks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  async function addStockLine() {
    if (!selectedHousehold) return;

    try {
      await addStock(newStock,selectedHousehold);

      await loadProducts(selectedHousehold);
      setNewStock({
        householdId: "",
        productId: "",
        qty_in_stock: 0,
        qty_needed: 0,
        last_updated: new Date().toISOString().split("T")[0],
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout du stock :", error);
    }
  }

  async function loadProducts(householdId: string) {
    try {
      setSelectedHousehold(householdId);
      const products = await getStocks(householdId);
      setAllStocks(products);
      setCurrentPage(1);
    } catch (error) {
      console.error("Erreur chargement stocks :", error);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (!currentUser) return;

        const userHouseholds = (await getUserHouseholds(currentUser.id)).flat();
        setHouseholds(userHouseholds);

        if (userHouseholds.length > 0) {
          loadProducts(userHouseholds[0].id);
        }
      } catch (error) {
        console.error("Erreur lors du chargement :", error);
      }
    }

    load();
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header
        page="Stocks"
        user={user}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <main className="flex flex-1 overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="flex flex-1 flex-col bg-[var(--bg-200)] p-4 md:p-6 overflow-auto">
          <h1 className="text-white text-xl font-semibold mb-4">Gestion des Stocks</h1>

          {/* Sélecteur de ménage */}
          <div className="mb-4">
            <label className="text-white block mb-2">Sélectionnez un foyer :</label>
            <select
              className="rounded bg-[var(--bg-700)] text-white p-2 w-full max-w-xs"
              value={selectedHousehold}
              onChange={(e) => loadProducts(e.target.value)}
            >
              <option value="" className="bg-[var(--bg-700)] text-white">
                Sélectionnez un foyer
              </option>
              {households.map((household) => (
                <option key={household.id} value={household.id}>
                  {household.name}
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
                  placeholder="Nom du produit..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                />
              </div>

              <div>
                <label className="text-white block mb-1">Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StockStatus | "all");
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="overstock">Sur stock</option>
                  <option value="in_stock">En stock</option>
                  <option value="soon_to_buy">À bientôt racheter</option>
                  <option value="urgent_to_buy">À racheter urgent</option>
                </select>
              </div>

              <div>
                <label className="text-white block mb-1">Trier par</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as "product" | "qty_in_stock" | "last_updated");
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                >
                  <option value="product">Nom du produit</option>
                  <option value="qty_in_stock">Quantité en stock</option>
                  <option value="last_updated">Date de mise à jour</option>
                </select>
              </div>

              <div>
                <label className="text-white block mb-1">Ordre</label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as "asc" | "desc");
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                >
                  <option value="asc">Croissant</option>
                  <option value="desc">Décroissant</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bouton pour afficher/masquer le formulaire d'ajout */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mb-4 bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600"
            >
              ➕ Ajouter un produit
            </button>
          )}

          {/* Formulaire d'ajout */}
          {showAddForm && (
            <div className="mb-6 bg-[var(--bg-700)] p-4 rounded-lg">
              <h2 className="text-white font-semibold mb-3">Nouveau produit</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Produit</label>
                  <input
                    type="text"
                    placeholder="Nom du produit"
                    value={newStock.productId}
                    onChange={(e) => setNewStock({ ...newStock, productId: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">En stock</label>
                  <input
                    type="number"
                    value={newStock.qty_in_stock}
                    onChange={(e) => setNewStock({ ...newStock, qty_in_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Nécessaire</label>
                  <input
                    type="number"
                    value={newStock.qty_needed}
                    onChange={(e) => setNewStock({ ...newStock, qty_needed: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Unité</label>
                  <input
                    type="text"
                    value={newStock.unit}
                    onChange={(e) => setNewStock({ ...newStock, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addStockLine}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  ✅ Enregistrer
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  ✖️ Annuler
                </button>
              </div>
            </div>
          )}

          {/* Légende des statuts */}
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-white text-sm">Sur stock</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-white text-sm">En stock</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-white text-sm">À bientôt racheter</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-white text-sm">À racheter urgent</span>
            </div>
          </div>

          {/* Liste des stocks */}
          <div className="space-y-4">
            {filteredStocks.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                Aucun produit trouvé
              </div>
            ) : (
              <>
                {paginatedStocks.map((product) => {
                  const stockKey = getStockKey(product);
                  const isEditing = editingKey === stockKey;
                  const status = getStockStatus(product);

                  return (
                    <div key={stockKey} className="bg-[var(--bg-700)] rounded-lg p-4 relative">
                      {/* Tag de statut */}
                      <div className={`absolute top-2 right-2 px-2 py-1 text-xs rounded-full text-white ${getStatusClass(status)}`}>
                        {getStatusLabel(status)}
                      </div>

                      {isEditing && editStock ? (
                        // Mode édition
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <label className="text-gray-400 text-sm block mb-1">Produit</label>
                              <input
                                type="text"
                                value={editStock.product}
                                onChange={(e) => setEditStock({ ...editStock, product: e.target.value })}
                                className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm block mb-1">En stock</label>
                              <input
                                type="number"
                                value={editStock.qty_in_stock}
                                onChange={(e) => setEditStock({ ...editStock, qty_in_stock: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm block mb-1">Nécessaire</label>
                              <input
                                type="number"
                                value={editStock.qty_needed}
                                onChange={(e) => setEditStock({ ...editStock, qty_needed: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                              />
                            </div>
                            <div>
                              <label className="text-gray-400 text-sm block mb-1">Unité</label>
                              <input
                                type="text"
                                value={editStock.unit}
                                onChange={(e) => setEditStock({ ...editStock, unit: e.target.value })}
                                className="w-full px-3 py-2 bg-[var(--bg-500)] text-white rounded"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={saveEditing}
                              className="bg-green-500 text-white px-4 py-2 rounded flex-1 hover:bg-green-600"
                            >
                              ✅ Sauvegarder
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="bg-gray-500 text-white px-4 py-2 rounded flex-1 hover:bg-gray-600"
                            >
                              ✖️ Annuler
                            </button>
                          </div>
                        </>
                      ) : (
                        // Mode affichage
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-gray-400 text-sm">Produit</p>
                              <p className="text-white font-medium">{product.product}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">En stock</p>
                              <p className="text-white font-medium">{product.qty_in_stock} {product.unit}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Nécessaire</p>
                              <p className="text-white font-medium">{product.qty_needed} {product.unit}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Dernière MAJ</p>
                              <p className="text-white font-medium">
                                {new Date(product.last_updated).toLocaleDateString("fr-FR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditing(product)}
                              className="bg-blue-500 text-white px-4 py-2 rounded flex-1 flex items-center justify-center gap-2 hover:bg-blue-600"
                            >
                              ✏️ Éditer
                            </button>
                            <button
                              onClick={() => deleteStockLine(product)} 
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
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded-l-md border border-gray-300 bg-[var(--bg-700)] text-white disabled:opacity-50"
                      >
                        ← Précédent
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 border-t border-b border-gray-300 ${currentPage === page ? 'bg-blue-500 text-white' : 'bg-[var(--bg-700)] text-white'}`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded-r-md border border-gray-300 bg-[var(--bg-700)] text-white disabled:opacity-50"
                      >
                        Suivant →
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Stocks;