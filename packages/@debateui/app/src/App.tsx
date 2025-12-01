import type { FC } from 'react';

export const App: FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            DebateUI
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Multi-Agent Debate Platform
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-gray-600">
            Wave 0 scaffolding complete. Ready for Wave 1.
          </p>
        </div>
      </main>
    </div>
  );
};
