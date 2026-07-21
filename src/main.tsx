import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './product-details.css';
import './information.css';
import './auth.css';
import './account.css';
import './reviews.css';
import './review-card-footer.css';
import './review-form.css';
import './account-orders.css';
import './admin.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
