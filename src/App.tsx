import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CatalogPage } from './pages/CatalogPage';
import { HomePage } from './pages/HomePage';

function Placeholder({ title }: { title: string }) {
  return <main><h1>{title}</h1></main>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes><Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/product/:slug" element={<Placeholder title="Аромат" />} />
        <Route path="/cart" element={<Placeholder title="Корзина" />} />
        <Route path="/checkout" element={<Placeholder title="Оформление" />} />
      </Route></Routes>
    </BrowserRouter>
  );
}
