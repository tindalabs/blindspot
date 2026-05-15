'use client';
import { useState } from 'react';

interface Task {
  id: number;
  text: string;
  done: boolean;
}

const initial: Task[] = [
  { id: 1, text: 'Set up OTel Collector', done: true },
  { id: 2, text: 'Open Grafana dashboard', done: false },
  { id: 3, text: 'Explore your first trace', done: false },
];

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [input, setInput] = useState('');

  function toggle(id: number) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setTasks((prev) => [...prev, { id: Date.now(), text: input.trim(), done: false }]);
    setInput('');
  }

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Tasks</h2>
        {tasks.map((t) => (
          <div className="task-item" key={t.id}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            <span style={t.done ? { textDecoration: 'line-through', color: '#64748b' } : {}}>
              {t.text}
            </span>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: '0.75rem' }}>Add a task</h3>
        <form onSubmit={addTask}>
          <input
            type="text"
            placeholder="What needs to be done?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-primary">Add task</button>
        </form>
      </div>
    </>
  );
}
