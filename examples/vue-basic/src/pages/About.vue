<template>
  <div class="card">
    <h2 style="margin-bottom: 0.5rem">About</h2>
    <p style="color: #6b7280; line-height: 1.6">
      This example app is instrumented with <strong>@tindalabs/blindspot-vue</strong>.
      It records route navigations via <code>installBlindspotRouter</code>, user interactions,
      form submissions, fetch calls, and web vitals — all as OpenTelemetry spans, without
      capturing any personally identifiable information.
    </p>
  </div>
  <div class="card">
    <h3 style="margin-bottom: 0.75rem">Stack</h3>
    <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.5rem">
      <li><strong>SDK</strong> → @tindalabs/blindspot-vue (this repo)</li>
      <li><strong>Router</strong> → Vue Router 4 + installBlindspotRouter</li>
      <li><strong>Collector</strong> → OpenTelemetry Collector Contrib (localhost:4318)</li>
      <li><strong>Storage</strong> → Grafana Tempo</li>
      <li><strong>Visualization</strong> → Grafana (localhost:3100)</li>
    </ul>
  </div>
</template>
