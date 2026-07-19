import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CatalogPage } from './pages/CatalogPage';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CartProvider } from './hooks/useCart';
import { CheckoutPage } from './pages/CheckoutPage';
import { ContactsPage, DeliveryPage, OriginalityPage } from './pages/InformationPages';
import { AuthProvider } from './auth/AuthProvider';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AccountPage } from './pages/AccountPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ReviewsPage } from './pages/ReviewsPage';
import { OrderReviewPage } from './pages/OrderReviewPage';

function Placeholder({ title }: { title: string }) {
  return <main><h1>{title}</h1></main>;
}

export function App() {
  return (
    <AuthProvider><CartProvider><BrowserRouter>
      <Routes><Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/originality" element={<OriginalityPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/account/orders/:orderId/review" element={<ProtectedRoute><OrderReviewPage /></ProtectedRoute>} />
      </Route></Routes>
    </BrowserRouter></CartProvider></AuthProvider>
  );
}
