import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProcessingPage from './pages/ProcessingPage';
import ResultsPage from './pages/ResultsPage';
import PatchComparisonPage from './pages/PatchComparisonPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/processing/:jobId" element={<ProcessingPage />} />
        <Route path="/results/:jobId" element={<ResultsPage />} />
        <Route path="/results/:jobId/patches" element={<PatchComparisonPage />} />
      </Routes>
    </BrowserRouter>
  );
}
