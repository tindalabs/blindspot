<script setup>
import { ref } from 'vue';
import { recordEvent } from '@tindalabs/blindspot';
import { useBlindspot } from '@tindalabs/blindspot-vue';

const { setAttribute } = useBlindspot();
const status = ref(null);
const loading = ref(false);

async function handleFetch() {
  loading.value = true;
  status.value = null;
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
    const data = await res.json();
    recordEvent('demo.fetch_complete', { 'demo.todo_id': String(data.id) });
    setAttribute('demo.last_todo_title', data.title);
    status.value = { text: `Fetched todo: "${data.title}"`, kind: 'ok' };
  } catch {
    status.value = { text: 'fetch failed', kind: 'err' };
  } finally {
    loading.value = false;
  }
}

function handleError() {
  setTimeout(() => {
    throw new Error('Demo unhandled error — check the error span in Grafana');
  }, 0);
}
</script>

<template>
  <div class="card">
    <h2 style="margin-bottom: 0.5rem">Welcome to the Vue demo app</h2>
    <p style="color: #6b7280; margin-bottom: 1rem">
      Every click, navigation, form submission and fetch call below generates an
      OpenTelemetry span. Open
      <a href="http://localhost:3100" target="_blank" rel="noreferrer">Grafana</a> to see them.
    </p>
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap">
      <button class="btn-primary" @click="handleFetch" :disabled="loading" data-blindspot-label="fetch-task-data">
        {{ loading ? 'Fetching…' : 'Fetch task data' }}
      </button>
      <button class="btn-secondary" @click="handleError" data-blindspot-label="trigger-error">Trigger JS error</button>
    </div>
    <p v-if="status" style="margin-top: 0.75rem; font-size: 0.85rem">
      <span :class="`badge ${status.kind}`">{{ status.kind === 'ok' ? '200 OK' : 'Error' }}</span>
      {{ status.text }}
    </p>
  </div>
  <div class="card">
    <h3 style="margin-bottom: 0.75rem">Try navigating</h3>
    <p style="color: #6b7280">
      Use the nav links above to move between pages. Each navigation creates a new root
      span in your trace, instrumented by <code>installBlindspotRouter</code>.
    </p>
  </div>
</template>
