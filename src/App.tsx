import { Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import ProtectedRoute from "./components/security/ProtectedRoute";
import ErrorP from "./pages/Error";
import Stocks from "./pages/Stocks";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute profile="user">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/register" element={
        //<ProtectedRoute profile="admin">
          <Register />
        //</ProtectedRoute>
        } 
      />
      <Route path="/login" element={<Login />} />
      <Route path="/stocks" element={
        <ProtectedRoute profile="user">
          <Stocks />
        </ProtectedRoute>
      } />
      <Route path="*" element={<ErrorP code={404} message="Page not found"/>} />
    </Routes>
  );
}

export default App;
