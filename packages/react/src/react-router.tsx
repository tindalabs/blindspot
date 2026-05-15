import { Routes, type RoutesProps, useLocation, useNavigationType } from 'react-router-dom';
import { useBlindspotNavigate } from './navigate-hook.js';

export function BlindspotRoutes({ children, location }: RoutesProps) {
  const loc = useLocation();
  const navType = useNavigationType();
  const trigger = navType === 'POP' ? 'back-forward' : 'user';

  useBlindspotNavigate(loc.pathname, loc.search, trigger);

  if (location !== undefined) {
    return <Routes location={location}>{children}</Routes>;
  }
  return <Routes>{children}</Routes>;
}
