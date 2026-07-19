# 🚆 Rail-Sphere

A full-stack train ticket booking system with route-based partial seat allocation, multi-coach booking, JWT authentication, email ticketing, and PNR status tracking.

🔗 **Live App:** [rail-sphere.vercel.app](https://rail-sphere.vercel.app)
📦 **Repository:** [github.com/naveenk2608/Rail-Sphere](https://github.com/naveenk2608/Rail-Sphere)

![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react) ![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?logo=vite) ![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-339933?logo=node.js) ![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?logo=mysql)

---

## ✨ Features

- 🔍 **Train Search** — Search by source/destination station and journey date
- 🚉 **Route-Aware Availability** — Seat availability computed per route segment, not just per train, so a seat booked Station A→C can still be sold for D→F
- 🪑 **Interactive Seat Map** — Visual coach/seat selection per coach type (SL, 3A, 2A, 1A)
- 👥 **Multi-Passenger Booking** — Book multiple passengers in one transaction, mapped individually to seats
- 🎟️ **PNR Generation & Status Lookup** — Every booking gets a unique PNR, publicly checkable without login
- 📧 **Email Ticketing** — Ticket confirmations sent via Nodemailer
- 📄 **My Bookings** — View, revisit, and cancel past bookings
- 💾 **Saved Passengers** — Save frequent passenger details for faster checkout
- 🔐 **JWT Authentication** — Signup/login with hashed passwords (bcrypt) and protected routes
- 💰 **Fare Calculation** — Distance-based fare lookup per coach class
- 📱 **Responsive UI** — Built with plain CSS per component, no UI framework

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (11-table relational schema) |
| **Auth** | JWT + bcrypt |
| **Email** | Nodemailer |
| **Deployment** | Frontend → Vercel · Backend → Render |

---

## 🗄️ Database Schema

An 11-table normalized MySQL schema (`schema.sql`) models the full booking domain:

`users` · `saved_passengers` · `stations` · `trains` · `train_run_days` · `train_routes` · `coaches` · `bookings` · `seat_bookings` · `booking_passengers` · `passenger_seat_map`

Key design points:
- **`train_routes`** stores each stop's sequence, arrival/departure time, and distance from origin — the basis for route-based fare and availability logic.
- **`seat_bookings`** stores `from_seq`/`to_seq` per seat per journey date, so overlapping-segment availability can be computed instead of blocking the whole seat for the entire route.
- **`train_run_days`** encodes which days of the week a train runs.
- **`passenger_seat_map`** links individual passengers to their specific allotted seat within a booking.

---

## 📂 Project Structure

```
Rail-Sphere/
├── schema.sql                      # Full MySQL schema (11 tables)
├── backend/
│   ├── server.js                   # Express app entry point
│   ├── db.js                       # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── passengerController.js
│   │   ├── stationController.js
│   │   └── trainController.js
│   ├── routes/
│   │   ├── authRoutes.js           # /api/auth
│   │   ├── bookingRoutes.js        # /api/bookings
│   │   ├── passengerRoutes.js      # /api/passengers
│   │   ├── stationRoutes.js        # /api/stations
│   │   └── trainRoutes.js          # /api/trains
│   ├── middleware/
│   │   └── authMiddleware.js       # JWT verification
│   └── utils/
│       ├── mailer.js               # Nodemailer email sending
│       └── pnrGenerator.js         # Unique PNR generation
└── frontend/
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── components/
        │   ├── SearchBox.jsx / .css
        │   ├── StationInput.jsx / .css
        │   ├── DatePicker.jsx / .css
        │   ├── RouteModal.jsx / .css
        │   ├── Navbar.jsx / .css
        │   └── Toast.jsx / .css
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── SearchResults.jsx
        │   ├── SeatMap.jsx
        │   ├── PassengerDetails.jsx
        │   ├── Ticket.jsx
        │   ├── PNRStatus.jsx
        │   ├── MyBookings.jsx
        │   ├── Login.jsx / Signup.jsx
        │   └── Auth.css
        ├── hooks/
        │   ├── useAuth.js
        │   └── useDebounce.js
        ├── utils/
        │   ├── api.js               # Axios/fetch wrapper
        │   └── fareCalculator.js
        └── styles/
            └── global.css
```

---

## 🔌 API Overview

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | POST | — | Create a new user |
| `/api/auth/login` | POST | — | Login, returns JWT |
| `/api/stations/search` | GET | — | Search stations by name/code |
| `/api/trains/search` | GET | — | Search trains between two stations for a date |
| `/api/trains/fare` | GET | — | Get fare for a route + coach class |
| `/api/trains/:trainId/route` | GET | — | Full stoppage list for a train |
| `/api/trains/:trainId/coaches` | GET | — | Coach layout for a train |
| `/api/trains/:trainId/seats` | GET | — | Booked seats for a train/date |
| `/api/bookings` | POST | ✅ | Create a booking |
| `/api/bookings/my` | GET | ✅ | Get logged-in user's bookings |
| `/api/bookings/:bookingId` | GET | ✅ | Get a specific booking |
| `/api/bookings/:bookingId/cancel` | PATCH | ✅ | Cancel a booking |
| `/api/bookings/:bookingId/email` | POST | ✅ | Email the ticket |
| `/api/bookings/pnr/:pnr` | GET | — | Public PNR status lookup |
| `/api/passengers/saved` | GET/POST | ✅ | Manage saved passenger list |
| `/api/passengers/saved/:id` | DELETE | ✅ | Remove a saved passenger |
| `/api/health` | GET | — | Health check |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL (v8+)

### 1. Clone the repository
```bash
git clone https://github.com/naveenk2608/Rail-Sphere.git
cd Rail-Sphere
```

### 2. Set up the database
```bash
mysql -u root -p < schema.sql
```

### 3. Backend setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=railsphere_db
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173

# Email (Nodemailer)
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_app_password
```

Run the server:
```bash
npm run dev
```

### 4. Frontend setup
```bash
cd ../frontend
npm install
npm run dev
```

The frontend (Vite) runs on `http://localhost:5173` by default and expects the backend at the URL configured in `src/utils/api.js`.

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes
4. Push and open a Pull Request

---

## 👤 Author

**Naveen Kumar** — [@naveenk2608](https://github.com/naveenk2608)
B.Tech CSE, VIT-AP University
