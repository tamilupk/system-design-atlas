import { createBrowserRouter, Outlet, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const LessonPage = lazy(() => import('@/pages/LessonPage').then(m => ({ default: m.LessonPage })));
const ConceptPage = lazy(() => import('@/pages/ConceptPage').then(m => ({ default: m.ConceptPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function Loading() {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '60vh',
      color: 'var(--color-text-secondary)',
      fontSize: 'var(--text-sm)'
    }}>
      Loading...
    </div>
  );
}

function RootLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#/')) {
      const target = window.location.hash.slice(1);
      navigate(target, { replace: true });
    }
  }, [navigate]);

  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/archetypes/:archetypeId',
        element: <LessonPage />,
      },
      {
        path: '/archetypes/:archetypeId/steps/:stepId',
        element: <LessonPage />,
      },
      {
        path: '/concepts/:conceptId',
        element: <ConceptPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
