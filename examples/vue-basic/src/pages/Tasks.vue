<script setup>
import { ref } from 'vue';

const tasks = ref([
  { id: 1, text: 'Set up OTel Collector', done: true },
  { id: 2, text: 'Open Grafana dashboard', done: false },
  { id: 3, text: 'Explore your first trace', done: false },
]);
const input = ref('');

function toggle(id) {
  const task = tasks.value.find((t) => t.id === id);
  if (task) task.done = !task.done;
}

function addTask() {
  if (!input.value.trim()) return;
  tasks.value.push({ id: Date.now(), text: input.value.trim(), done: false });
  input.value = '';
}
</script>

<template>
  <div class="card">
    <h2 style="margin-bottom: 1rem">Tasks</h2>
    <div v-for="task in tasks" :key="task.id" class="task-item">
      <input type="checkbox" :checked="task.done" @change="toggle(task.id)" />
      <span :style="task.done ? 'text-decoration: line-through; color: #64748b' : ''">
        {{ task.text }}
      </span>
    </div>
  </div>
  <div class="card">
    <h3 style="margin-bottom: 0.75rem">Add a task</h3>
    <form @submit.prevent="addTask">
      <input type="text" placeholder="What needs to be done?" v-model="input" />
      <button type="submit" class="btn-primary">Add task</button>
    </form>
  </div>
</template>
