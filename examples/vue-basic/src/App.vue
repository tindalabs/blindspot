<template>
  <header>
    <h1>Blindspot</h1>
    <nav>
      <RouterLink to="/" data-blindspot-label="nav-home">Home</RouterLink>
      <RouterLink to="/tasks" data-blindspot-label="nav-tasks">Tasks</RouterLink>
      <RouterLink to="/about" data-blindspot-label="nav-about">About</RouterLink>
    </nav>
  </header>
  <main>
    <RouterView />
  </main>
</template>
