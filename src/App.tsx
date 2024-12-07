import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Settings from "@/pages/Settings";
import { ItemsPage } from "@/pages/Items";
import Categories from "@/pages/Categories";
import ScansPage from "@/pages/Scans";
import ScannedItemsPage from "@/pages/ScannedItems";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { ThemeProvider } from "@/components/theme-provider";
import "./App.css";

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Router>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container max-w-md mx-auto p-4 pb-24">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/items" element={<ScannedItemsPage />} />
              <Route path="/items/:receiptId" element={<ItemsPage />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/scans" element={<ScansPage />} />
            </Routes>
          </main>
          <Navigation />
          <Toaster />
          <OfflineIndicator />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;