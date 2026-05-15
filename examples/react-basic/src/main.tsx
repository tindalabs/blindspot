import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BlindspotProvider } from '@tindalabs/blindspot-react';
import { grantConsent } from '@tindalabs/blindspot';
import App from './App.js';

const blindspotConfig = {
  serviceName: 'blindspot-react-example',
  endpoint: '/v1/traces', // proxied by Vite dev server to localhost:4318
  privacy: {
    consentRequired: false,
  },
};

grantConsent();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BlindspotProvider config={blindspotConfig}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </BlindspotProvider>
  </React.StrictMode>,
);
