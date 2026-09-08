import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import EliteApp from './EliteApp';
import './elite.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element was not found');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <EliteApp />
    </BrowserRouter>
  </StrictMode>,
);
