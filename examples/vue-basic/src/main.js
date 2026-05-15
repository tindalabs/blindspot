import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { BlindspotPlugin } from '@tindalabs/blindspot-vue';
import { grantConsent } from '@tindalabs/blindspot';
import App from './App.vue';
import Home from './pages/Home.vue';
import Tasks from './pages/Tasks.vue';
import About from './pages/About.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/tasks', component: Tasks },
    { path: '/about', component: About },
  ],
});

const app = createApp(App);

grantConsent();

app.use(BlindspotPlugin, {
  config: {
    serviceName: 'blindspot-vue-example',
    endpoint: '/v1/traces',
    privacy: { consentRequired: false },
  },
  router,
});

app.use(router);
app.mount('#app');
