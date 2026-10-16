import {BrowserRouter, Link, Route, Routes} from 'react-router-dom';
import HospitalApp from './HospitalApp';
import SignupForm from './components/SignupForm';

export default function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/" element={<HospitalApp />} />
      <Route path="/signup" element={<SignupForm />} />
      <Route path="*" element={<main className="flex min-h-screen flex-col items-center justify-center gap-4 text-slate-900">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <Link to="/" className="text-sky-700 underline">Return to your workspace</Link>
      </main>} />
    </Routes>
  </BrowserRouter>;
}
