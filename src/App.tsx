import { BrowserRouter, Route, Routes } from 'react-router-dom';

function Placeholder({ title }: { title: string }) {
  return <main><h1>{title}</h1></main>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder title="Jardin Secret" />} />
        <Route path="/catalog" element={<Placeholder title="Каталог" />} />
        <Route path="/product/:slug" element={<Placeholder title="Аромат" />} />
        <Route path="/cart" element={<Placeholder title="Корзина" />} />
        <Route path="/checkout" element={<Placeholder title="Оформление" />} />
      </Routes>
    </BrowserRouter>
  );
}
