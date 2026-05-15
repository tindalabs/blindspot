import { init } from '@tindalabs/blindspot';
import { grantConsent, recordEvent } from '@tindalabs/blindspot-core';

init({
  serviceName: 'blindspot-example',
  endpoint: '/v1/traces', // proxied by Vite dev server to localhost:4318
  privacy: {
    consentRequired: false,
  },
});

grantConsent();

const tasks = [
  { id: 1, text: 'Set up OTel Collector', done: true },
  { id: 2, text: 'Open Grafana dashboard', done: false },
  { id: 3, text: 'Explore your first trace', done: false },
];
let nextId = 4;

function renderHome() {
  return `
    <div class="card">
      <h2 style="margin-bottom:0.5rem">Welcome to the demo app</h2>
      <p style="color:#6b7280;margin-bottom:1rem">Every click, navigation, form submission and fetch call below
      generates an OpenTelemetry span. Open <a href="http://localhost:3100" target="_blank">Grafana</a> to see them.</p>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap">
        <button class="btn-primary" id="btn-fetch">Fetch task data</button>
        <button class="btn-secondary" id="btn-error">Trigger JS error</button>
      </div>
      <p id="status"></p>
    </div>
    <div class="card">
      <h3 style="margin-bottom:0.75rem">Try navigating</h3>
      <p style="color:#6b7280">Use the nav links above to move between pages. Each navigation creates a new root span in your trace.</p>
    </div>`;
}

function renderTasks() {
  const list = tasks
    .map(
      (t) =>
        `<div class="task-item">
          <input type="checkbox" data-task-id="${t.id}" ${t.done ? 'checked' : ''}/>
          <span style="${t.done ? 'text-decoration:line-through;color:#9ca3af' : ''}">${t.text}</span>
        </div>`,
    )
    .join('');
  return `
    <div class="card">
      <h2 style="margin-bottom:1rem">Tasks</h2>
      ${list}
    </div>
    <div class="card">
      <h3 style="margin-bottom:0.75rem">Add a task</h3>
      <form id="add-task-form">
        <input type="text" name="task" placeholder="What needs to be done?" required />
        <button type="submit" class="btn-primary">Add task</button>
      </form>
    </div>`;
}

function renderAbout() {
  return `
    <div class="card">
      <h2 style="margin-bottom:0.5rem">About</h2>
      <p style="color:#6b7280;line-height:1.6">
        This example app is instrumented with <strong>@tindalabs/blindspot</strong>.
        It records route navigations, user interactions, form submissions, fetch calls,
        and web vitals — all as OpenTelemetry spans, without capturing any personally
        identifiable information.
      </p>
    </div>
    <div class="card">
      <h3 style="margin-bottom:0.75rem">Stack</h3>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:0.5rem">
        <li><strong>SDK</strong> → @tindalabs/blindspot (this repo)</li>
        <li><strong>Collector</strong> → OpenTelemetry Collector Contrib (localhost:4318)</li>
        <li><strong>Storage</strong> → Grafana Tempo</li>
        <li><strong>Visualization</strong> → Grafana (localhost:3000)</li>
      </ul>
    </div>`;
}

function bindHomeHandlers() {
  document.getElementById('btn-fetch')?.addEventListener('click', async () => {
    const status = document.getElementById('status');
    if (status) status.textContent = 'Fetching…';
    try {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      const data = await res.json();
      recordEvent('demo.fetch_complete', { 'demo.todo_id': String(data.id) });
      if (status) {
        const badge = `<span class="badge ok">200 OK</span>`;
        status.innerHTML = `${badge} Fetched todo: "${data.title}"`;
      }
    } catch (err) {
      if (status) status.innerHTML = `<span class="badge err">fetch failed</span>`;
    }
  });

  document.getElementById('btn-error')?.addEventListener('click', () => {
    setTimeout(() => {
      throw new Error('Demo unhandled error — check the error span in Grafana');
    }, 0);
  });
}

function bindTaskHandlers() {
  document.getElementById('add-task-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = e.target.elements.task;
    if (!input.value.trim()) return;
    tasks.push({ id: nextId++, text: input.value.trim(), done: false });
    navigate(location.pathname);
  });

  document.querySelectorAll('[data-task-id]').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const id = Number(e.target.dataset.taskId);
      const task = tasks.find((t) => t.id === id);
      if (task) task.done = e.target.checked;
      navigate(location.pathname);
    });
  });
}

function navigate(path) {
  const app = document.getElementById('app');
  const links = document.querySelectorAll('nav a');

  links.forEach((a) => {
    a.classList.toggle('active', new URL(a.href).pathname === path);
  });

  if (path === '/tasks') {
    app.innerHTML = renderTasks();
    bindTaskHandlers();
  } else if (path === '/about') {
    app.innerHTML = renderAbout();
  } else {
    app.innerHTML = renderHome();
    bindHomeHandlers();
  }
}

document.querySelectorAll('nav a').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const path = new URL(a.href).pathname;
    history.pushState({}, '', path);
    navigate(path);
  });
});

window.addEventListener('popstate', () => navigate(location.pathname));

navigate(location.pathname);
