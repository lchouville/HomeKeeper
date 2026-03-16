import { useEffect, useState, type SetStateAction } from "react";
import { Footer } from "../components/ui/Footer";
import { Header } from "../components/ui/Header";
import Sidebar from "../components/ui/Sidebar";
import { getCurrentUser, type AuthUser } from "../services/authService";
import {
  getUserHouseholds,
  type Household,
} from "../services/householdService";
import { addStock, getStocks, type Stock } from "../services/stocksService";

function stocks() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<string>("");
  const [newStock, setNewStock] = useState<Stock>({
    householdId: "",
    product: "",
    qty_in_stock: 0,
    qty_needed: 0,
    unit: "",
    last_updated: new Date().toISOString().split("T")[0],
  });
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function addStockLine() {
    try {
      await addStock(newStock, selectedHousehold);

      setStocks((prev) => [...prev, newStock]);

      setNewStock({
        householdId: "",
        product: "",
        qty_in_stock: 0,
        qty_needed: 0,
        unit: "",
        last_updated: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Erreur lors de l'ajout du stock :", error);
    }
  }
  async function loadProducts(newHoushold: string) {
    setSelectedHousehold(newHoushold);
    // load products lines
    await getStocks(newHoushold).then(setStocks);
  }
  function deleteStock(product: Stock) {}
  function editStock(product: Stock) {}
  
  useEffect(() => {
    async function load() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (!currentUser) return;

        const userHouseholds = (await getUserHouseholds(currentUser.id)).flat();
        setHouseholds(userHouseholds);

        // select the first household by default
        if (userHouseholds.length > 0) {
          loadProducts(userHouseholds[0].id);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    }
    load();
  }, []);
  return (
    <div className="h-screen flex flex-col">
      <Header page="dashboard" user={user} />

      <main className="flex flex-1 overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="flex flex-1 flex-col bg-[var(--bg-200)]">
          <h1 className="text-white">Stocks</h1>
          <label className="text-white mt-4">Sélectionnez un foyer :</label>
          <select
            className="rounded bg-[var(--bg-700)] text-white p-2 mt-4"
            value={selectedHousehold}
            onChange={(e) => loadProducts(e.target.value)}
          >
            <option value="">Sélectionnez un foyer</option>
            {/* script fill household items here first*/}
            {households.map((household) => (
              <option
                key={household.id}
                value={household.id}
                className="bg-[var(--bg-700)] text-white"
              >
                {household.name}
              </option>
            ))}
          </select>
          <table className="table-auto w-full mt-4 text-white">
            <thead>
              <tr>
                <th className="px-4 py-2">Produit</th>
                <th className="px-4 py-2">Quantité restante</th>
                <th className="px-4 py-2">Quantité nécessaire</th>
                <th className="px-4 py-2">Unité</th>
                <th className="px-4 py-2">Derniere mise à jour</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
              <tr>
                <th>
                  <input
                    id="inProd"
                    onChange={(e) =>
                      setNewStock({ ...newStock, product: e.target.value })
                    }
                    type="text"
                    placeholder="Produit"
                    value={newStock.product}
                    className="w-full px-2 py-1"
                  />
                </th>
                <th>
                  <input
                    id="inQtyA"
                    onChange={(e) =>
                      setNewStock({
                        ...newStock,
                        qty_in_stock: Number(e.target.value),
                      })
                    }
                    type="number"
                    placeholder="Quantité restante"
                    value={newStock.qty_in_stock}
                    className="w-full px-2 py-1"
                  />
                </th>
                <th>
                  <input
                    id="inQtyN"
                    onChange={(e) =>
                      setNewStock({
                        ...newStock,
                        qty_needed: Number(e.target.value),
                      })
                    }
                    type="number"
                    placeholder="Quantité nécessaire"
                    value={newStock.qty_needed}
                    className="w-full px-2 py-1"
                  />
                </th>
                <th>
                  <input
                    id="inUnit"
                    onChange={(e) =>
                      setNewStock({ ...newStock, unit: e.target.value })
                    }
                    type="text"
                    placeholder="Unité"
                    value={newStock.unit}
                    className="w-full px-2 py-1"
                  />
                </th>
                <th>
                  <input
                    id="inUpdate"
                    type="date"
                    value={new Date().toISOString().split("T")[0]}
                    disabled
                  />
                </th>
                <th>
                  <button
                    onClick={() => addStockLine()}
                    className="bg-green-500 text-white px-2 py-1 rounded"
                  >
                    Ajouter
                  </button>
                </th>
              </tr>
            </thead>
            <tbody id="stock_container">
              {stocks.map((product) => (
                <tr key={product.product}>
                  <td>{product.product}</td>
                  <td>{product.qty_in_stock}</td>
                  <td>{product.qty_needed}</td>
                  <td>{product.unit}</td>
                  <td>
                    {new Date(product.last_updated).toLocaleDateString(
                      "fr-FR",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      },
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => editStock(product)}
                      className="bg-blue-500 px-2 py-1 rounded"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => deleteStock(product)}
                      className="bg-red-500 px-2 py-1 rounded"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default stocks;
