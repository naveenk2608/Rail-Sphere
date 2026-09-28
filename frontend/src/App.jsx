import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { getUserFromToken } from "./hooks/useAuth";
import HomePage from "./pages/HomePage";
import HowItWorks from "./pages/HowItWorks";
import Login from "./pages/Login";
import MyBookings from "./pages/MyBookings";
import PassengerDetails from "./pages/PassengerDetails";
import PNRStatus from "./pages/PNRStatus";
import SearchResults from "./pages/SearchResults";
import SeatMap from "./pages/SeatMap";
import Signup from "./pages/Signup";
import Ticket from "./pages/Ticket";

function RequireAuth({ children }) {
  const user = getUserFromToken();
  if (!user) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }
  return children;
}

// New pages start at the top; links with a #hash scroll to that section
// once it has rendered.
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const timer = setTimeout(() => document.getElementById(id)?.scrollIntoView(), 60);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash]);
  return null;
}

const NO_FOOTER = new Set(["/login", "/signup"]);

function Shell() {
  const [authKey, setAuthKey] = useState(0);
  const location = useLocation();

  function refreshAuth() { setAuthKey((k) => k + 1); }

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <ScrollManager />
      <Navbar authKey={authKey} />
      <main id="main">
        {/* Keyed on the path so each page fades in on navigation. */}
        <div className="route-view" key={location.pathname}>
          <Routes location={location}>
            {/* Public */}
            <Route path="/"             element={<HomePage />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/login"        element={<Login  onLogin={refreshAuth} />} />
            <Route path="/signup"       element={<Signup onLogin={refreshAuth} />} />
            <Route path="/search"       element={<SearchResults />} />
            <Route path="/pnr-status"   element={<PNRStatus />} />

            {/* Seat map — public to view, auth required on continue */}
            <Route path="/seats"        element={<SeatMap />} />

            {/* Protected */}
            <Route path="/passengers"        element={<RequireAuth><PassengerDetails /></RequireAuth>} />
            <Route path="/ticket/:bookingId" element={<RequireAuth><Ticket /></RequireAuth>} />
            <Route path="/my-bookings"       element={<RequireAuth><MyBookings /></RequireAuth>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
      {!NO_FOOTER.has(location.pathname) && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
