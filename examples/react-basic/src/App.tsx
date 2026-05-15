import { NavLink, Route } from 'react-router-dom';
import { BlindspotRoutes } from '@tindalabs/blindspot-react/react-router';
import Home from './pages/Home.js';
import Tasks from './pages/Tasks.js';
import About from './pages/About.js';

export default function App() {
  return (
    <>
      <header>
        <h1>Blindspot</h1>
        <nav>
          <NavLink to="/" end data-blindspot-label="nav-home">Home</NavLink>
          <NavLink to="/tasks" data-blindspot-label="nav-tasks">Tasks</NavLink>
          <NavLink to="/about" data-blindspot-label="nav-about">About</NavLink>
        </nav>
      </header>
      <main>
        <BlindspotRoutes>
          <Route path="/" element={<Home />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/about" element={<About />} />
        </BlindspotRoutes>
      </main>
    </>
  );
}
