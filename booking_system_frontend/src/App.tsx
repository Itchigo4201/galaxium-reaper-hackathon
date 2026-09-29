import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from './hooks/useUser';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Flights } from './pages/Flights';
import { MyBookings } from './pages/MyBookings';
import { DestinationDetail } from './pages/DestinationDetail';
import { HackathonDemo } from './pages/HackathonDemo';

function App() {
  if (import.meta.env.VITE_HACKATHON_DEMO === 'true') {
    return <HackathonDemo />;
  }

  return (
    <BrowserRouter>
      <UserProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/destinations/:slug" element={<DestinationDetail />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Layout>
      </UserProvider>
    </BrowserRouter>
  );
}

export default App;

// Made with Bob
