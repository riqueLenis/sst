import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./store/AppContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Sectors from "./pages/Sectors";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import PPEs from "./pages/PPEs";
import PPEDeliveries from "./pages/PPEDeliveries";
import Financial from "./pages/Financial";
import Programs from "./pages/Programs";
import OccupationalHealth from "./pages/OccupationalHealth";

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="empresas" element={<Companies />} />
            <Route path="setores" element={<Sectors />} />
            <Route path="colaboradores" element={<Employees />} />
            <Route path="colaboradores/:id" element={<EmployeeProfile />} />
            <Route path="epis" element={<PPEs />} />
            <Route path="entregas" element={<PPEDeliveries />} />
            <Route path="saude" element={<OccupationalHealth />} />
            <Route path="programas" element={<Programs />} />
            <Route path="financeiro" element={<Financial />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}
