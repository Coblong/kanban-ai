import BoardPageClient from './BoardPageClient';

// Required for output: 'export' — FastAPI catch-all serves index.html for
// real board paths so client-side routing handles them at runtime.
export function generateStaticParams() {
  return [{ id: '_build_' }];
}

export default function BoardPage() {
  return <BoardPageClient />;
}
