import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ArticulosPage } from './pages/ArticulosPage';
import { SalidasPage } from './pages/SalidasPage';
import { ComprasPage } from './pages/ComprasPage';
import { OrdenesPage } from './pages/OrdenesPage';
import { EmpleadosPage } from './pages/EmpleadosPage';
import { AjustesPage } from './pages/AjustesPage';
import { AuditoriaPage } from './pages/AuditoriaPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            fontSize: '13px',
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas Protegidas dentro de Layout */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={
                <Layout>
                  <DashboardPage />
                </Layout>
              }
            />
            <Route
              path="/articulos"
              element={
                <Layout>
                  <ArticulosPage />
                </Layout>
              }
            />
            <Route
              path="/salidas"
              element={
                <Layout>
                  <SalidasPage />
                </Layout>
              }
            />
            <Route
              path="/compras"
              element={
                <Layout>
                  <ComprasPage />
                </Layout>
              }
            />
            <Route
              path="/ordenes"
              element={
                <Layout>
                  <OrdenesPage />
                </Layout>
              }
            />
            <Route
              path="/empleados"
              element={
                <Layout>
                  <EmpleadosPage />
                </Layout>
              }
            />
            <Route
              path="/ajustes"
              element={
                <Layout>
                  <AjustesPage />
                </Layout>
              }
            />
            <Route
              path="/auditoria"
              element={
                <Layout>
                  <AuditoriaPage />
                </Layout>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
