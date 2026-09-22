import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import { getUserFromToken } from "./hooks/useAuth";
import HomePage from "./pages/HomePage";
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

export default function App() {
  const [authKey, setAuthKey] = useState(0);

  function refreshAuth() { setAuthKey((k) => k + 1); }

  return (
    <BrowserRouter>
      <Navbar onAuthChange={authKey} />
      <Routes>
        {/* Public */}
        <Route path="/"           element={<HomePage />} />
        <Route path="/login"      element={<Login  onLogin={refreshAuth} />} />
        <Route path="/signup"     element={<Signup onLogin={refreshAuth} />} />
        <Route path="/search"     element={<SearchResults />} />
        <Route path="/pnr-status" element={<PNRStatus />} />

        {/* Seat map — public to view, auth required on continue */}
        <Route path="/seats"      element={<SeatMap />} />

        {/* Protected */}
        <Route path="/passengers" element={<RequireAuth><PassengerDetails /></RequireAuth>} />
        <Route path="/ticket/:bookingId" element={<RequireAuth><Ticket /></RequireAuth>} />
        <Route path="/my-bookings"       element={<RequireAuth><MyBookings /></RequireAuth>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}