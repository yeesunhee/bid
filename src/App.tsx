import MainLayout from './components/MainLayout';
import { PromptStoreProvider } from './hooks/usePromptStore';

export default function App() {
  return (
    <PromptStoreProvider>
      <MainLayout />
    </PromptStoreProvider>
  );
}
