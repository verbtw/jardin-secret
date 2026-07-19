import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CatalogPage } from './pages/CatalogPage';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CartProvider } from './hooks/useCart';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContactsPage, DeliveryPage, OriginalityPage } from './pages/InformationPages';

function Placeholder({ title }: { title: string }) {
  return <main><h1>{title}</h1></main>;
}

export function App() {
  return (
    <CartProvider><BrowserRouter>
      <Routes><Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/originality" element={<OriginalityPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
      </Route></Routes>
    </BrowserRouter></CartProvider>
  );
}
