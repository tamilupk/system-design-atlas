import { createHashRouter, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';

const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const LessonPage = lazy(() => import('@/pages/LessonPage').then(m => ({ default: m.LessonPage })));
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
  return (
    <AppShell>
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

export const router = createHashRouter([
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
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
