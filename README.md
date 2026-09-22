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
- 📱 **Responsive UI** — Plain CSS per component, no UI framework; rem-based type scale and breakpoints at 900 / 768 / 560 / 480px

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (8-table relational schema) |
| **Auth** | JWT + bcrypt |
| **Email** | Nodemailer |
| **Deployment** | Frontend → Vercel · Backend → Render |

---

## 🗄️ Database Schema

An 8-table MySQL schema (`schema.sql`) models the booking domain:

`users` · `stations` · `trains` · `train_run_days` · `train_routes` · `coaches` · `bookings` · `seat_bookings`

Key design points:
- **`train_routes`** stores each stop's sequence, arrival/departure time, day offset, and distance from origin — the basis for route-based fare and availability logic. The day offset lets a journey span more than one calendar day.
- **`seat_bookings`** is one row per passenger, per seat, per route segment. Storing `from_seq`/`to_seq` lets overlapping-segment availability be computed instead of blocking a seat for the whole route, and `idx_availability` covers that lookup.
- **`train_run_days`** encodes which days of the week a train runs, keyed on `(train_id, day_of_week)`.
- Passengers live on `seat_bookings` rather than in separate tables. The relationship is strictly one passenger to one seat, so splitting them produced a cartesian product and no benefit.
- Saved-passenger suggestions are **derived** from booking history rather than stored, so they cannot drift from what was actually booked.
- Coach class reference data (fare rate per km, label, seat layout, reservation charge, GST) lives in `backend/config/coach-classes.json`, served to the frontend via `/api/trains/classes` so it has exactly one home.

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
│   ├── config/
│   │   ├── coach-classes.json      # Fare rates, labels, seat layout
│   │   └── coachClasses.js         # Loader + fare calculation
│   └── utils/
│       ├── mailer.js               # Nodemailer email sending
│       └── pnrGenerator.js         # Random PNR generation
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
        │   ├── useAuth.js           # Decodes the JWT for display
        │   └── useDebounce.js
        ├── utils/
        │   ├── api.js               # fetch wrapper
        │   ├── dates.js             # Timezone-safe date helpers
        │   └── fareCalculator.js    # Fare preview from server config
        └── styles/
            └── global.css           # Design tokens, type scale, breakpoints
```

---

## 🔌 API Overview

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/register` | POST | — | Create a new user |
| `/api/auth/login` | POST | — | Login, returns JWT |
| `/api/stations/search` | GET | — | Search stations by name/code |
| `/api/trains/search` | GET | — | Search trains between two stations for a date |
| `/api/trains/classes` | GET | — | Coach class labels, fare rates and seat layout |
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
| `/api/passengers/saved` | GET | ✅ | Recent passengers, derived from booking history |
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
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=railsphere_db

# Only needed for a managed database that requires TLS (e.g. Aiven).
# Leave unset for a plain local MySQL, or the connection will fail.
# DB_CA_CERT="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"

# Required — the server refuses to start without it.
JWT_SECRET=your_jwt_secret

# Comma-separated list of allowed origins.
FRONTEND_URL=http://localhost:5173

# Email (Nodemailer, Gmail app password)
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_gmail_app_password
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
