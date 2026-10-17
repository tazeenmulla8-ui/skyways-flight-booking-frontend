import { useEffect, useMemo, useState } from "react";

import {
  Plane,
  Search,
  User,
  LogOut,
  MessageCircle,
  X,
  Send,
  CalendarDays,
  ArrowRight,
  Ticket,
  ShieldCheck,
  Menu,
  Sparkles,
  Clock3,
  MapPin,
  CreditCard,
  CheckCircle2,
} from "lucide-react";

import "./App.css";

const API = "http://127.0.0.1:8000";

const CITIES = [
  "Belagavi",
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Hyderabad",
];

const TODAY = new Date().toLocaleDateString("en-CA");

async function apiRequest(path, options = {}, token = "") {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || "Request failed. Check your backend."
    );
  }

  return data;
}

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("flight_token") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("flight_user") || "null"
      );
    } catch {
      return null;
    }
  });

  const [page, setPage] = useState(
    localStorage.getItem("flight_token")
      ? "home"
      : "login"
  );

  const [authMode, setAuthMode] = useState("login");

  const [auth, setAuth] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [origin, setOrigin] = useState("Belagavi");
  const [destination, setDestination] = useState("Bengaluru");
  const [travelDate, setTravelDate] = useState(TODAY);
  const [passengers, setPassengers] = useState("1");

  const [flights, setFlights] = useState([]);
  const [chosenFlight, setChosenFlight] = useState(null);
  const [seat, setSeat] = useState("12A");
  const [passengerName, setPassengerName] = useState("");
  const [bookings, setBookings] = useState([]);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

 
  const [chatMessages, setChatMessages] = useState([
  {
    role: "assistant",
    text:
      "Hi! I'm your Gemini AI Flight Assistant. " +
      "Ask me about flight bookings, seats, payments, " +
      "cancellations, or travel questions.",
  },
]);


  const [mobileMenu, setMobileMenu] = useState(false);

  const total = useMemo(() => {
    if (!chosenFlight) return 0;

    return chosenFlight.price * Number(passengers);
  }, [chosenFlight, passengers]);

  function showNotice(text) {
    setNotice(text);
    setError("");
  }

  function showError(text) {
    setError(text);
    setNotice("");
  }

  useEffect(() => {
    if (!token) return;

    apiRequest("/me", {}, token)
      .then((data) => {
        setUser(data);
        localStorage.setItem(
          "flight_user",
          JSON.stringify(data)
        );
      })
      .catch(() => {
        logout();
      });
  }, []);

  function logout() {
    localStorage.removeItem("flight_token");
    localStorage.removeItem("flight_user");

    setToken("");
    setUser(null);
    setChosenFlight(null);
    setFlights([]);
    setBookings([]);
    setPage("login");
    setAuthMode("login");
    setError("");
    setNotice("");
  }

  async function submitAuth(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      if (authMode === "signup") {
        await apiRequest("/signup", {
          method: "POST",
          body: JSON.stringify(auth),
        });

        setAuthMode("login");
        setAuth((old) => ({
          ...old,
          password: "",
        }));

        showNotice(
          "Account created successfully. Please log in."
        );

        return;
      }

      const data = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({
          email: auth.email,
          password: auth.password,
        }),
      });

      localStorage.setItem(
        "flight_token",
        data.access_token
      );

      localStorage.setItem(
        "flight_user",
        JSON.stringify(data.user)
      );

      setToken(data.access_token);
      setUser(data.user);
      setPage("home");

      showNotice(`Welcome, ${data.user.name}!`);
    } catch (err) {
      showError(err.message);
    }
  }

  async function searchFlights(event) {
    event?.preventDefault();
    setError("");
    setNotice("");

    if (origin === destination) {
      showError(
        "Departure and destination must be different."
      );
      return;
    }

    try {
      const params = new URLSearchParams({
        origin,
        destination,
      });

      const data = await apiRequest(
        `/flights?${params.toString()}`,
        {},
        token
      );

      setFlights(data.flights);
      setPage("flights");

      if (!data.flights.length) {
        showNotice(
          "No demo flights were found for this route. Try another route."
        );
      }
    } catch (err) {
      showError(err.message);
    }
  }

  async function openBookings() {
    try {
      const data = await apiRequest(
        "/bookings",
        {},
        token
      );

      setBookings(data.bookings);
      setPage("bookings");
      setError("");
    } catch (err) {
      showError(err.message);
    }
  }

  function startBooking(flight) {
    setChosenFlight(flight);
    setSeat("12A");
    setPassengerName(user?.name || "");
    setPage("checkout");
    setError("");
    setNotice("");
  }

  async function confirmBooking(event) {
    event.preventDefault();

    if (!chosenFlight) {
      showError("Please select a flight first.");
      return;
    }

    try {
      const data = await apiRequest(
        "/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            flight_id: chosenFlight.id,
            travel_date: travelDate,
            passengers: Number(passengers),
            passenger_name: passengerName,
            seat,
          }),
        },
        token
      );

      setBookings((previous) => [
        data.booking,
        ...previous,
      ]);

      setChosenFlight(null);
      setPage("confirmation");
      showNotice(
        `Demo booking confirmed! Reference: ${data.booking.booking_reference}`
      );
    } catch (err) {
      showError(err.message);
    }
  }

  async function cancelBooking(id) {
    const confirmed = window.confirm(
      "Cancel this demo booking?"
    );

    if (!confirmed) return;

    try {
      const data = await apiRequest(
        `/bookings/${id}`,
        { method: "DELETE" },
        token
      );

      showNotice(data.message);
      await openBookings();
    } catch (err) {
      showError(err.message);
    }
  }

  async function sendChat(event) {
    event.preventDefault();

    const message = chatInput.trim();

    if (!message || chatBusy) return;

    setChatMessages((previous) => [
      ...previous,
      { role: "user", text: message },
    ]);

    setChatInput("");
    setChatBusy(true);

    try {
      const data = await apiRequest(
        "/ai/chat",
        {
          method: "POST",
          body: JSON.stringify({ message }),
        },
        token
      );

      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: data.answer,
        },
      ]);
    } catch (err) {
      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: err.message,
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  // ---------- Login and signup screens ----------

  if (!token || !user) {
    return (
      <div className="auth-layout">
        <section className="auth-art">
          <div className="brand brand-light">
            <span className="brand-mark">
              <Plane size={23} />
            </span>
            SKYWAYS
          </div>

          <div className="auth-copy">
            <span className="eyebrow">
              YOUR JOURNEY STARTS HERE
            </span>

            <h1>
              More than a flight.
              <br />
              A fresh beginning.
            </h1>

            <p>
              Discover new places, book with confidence,
              and let every journey take you somewhere
              wonderful.
            </p>

            <div className="auth-benefits">
              <span>
                <ShieldCheck size={17} />
                Simple booking
              </span>

              <span>
                <Sparkles size={17} />
                Smart assistance
              </span>
            </div>
          </div>

          <div className="plane-decoration">
            <Plane size={200} strokeWidth={0.8} />
          </div>

          <small className="demo-note">
            Independent learning project · Demo only
          </small>
        </section>

        <section className="auth-panel">
          <div className="auth-card">
            <div className="brand auth-mobile-brand">
              <span className="brand-mark">
                <Plane size={22} />
              </span>
              SKYWAYS
            </div>

            <span className="eyebrow blue">
              {authMode === "login"
                ? "WELCOME BACK"
                : "GET STARTED"}
            </span>

            <h2>
              {authMode === "login"
                ? "Sign in to SkyWays"
                : "Create your account"}
            </h2>

            <p className="muted">
              {authMode === "login"
                ? "Your next adventure is a few clicks away."
                : "Create an account to start exploring."}
            </p>

            <form
              className="form-stack"
              onSubmit={submitAuth}
            >
              {authMode === "signup" && (
                <label>
                  Full name
                  <input
                    required
                    minLength="2"
                    maxLength="80"
                    placeholder="Enter your name"
                    value={auth.name}
                    onChange={(event) =>
                      setAuth({
                        ...auth,
                        name: event.target.value,
                      })
                    }
                  />
                </label>
              )}

              <label>
                Email address
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={auth.email}
                  onChange={(event) =>
                    setAuth({
                      ...auth,
                      email: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  required
                  minLength="8"
                  maxLength="72"
                  placeholder="At least 8 characters"
                  value={auth.password}
                  onChange={(event) =>
                    setAuth({
                      ...auth,
                      password: event.target.value,
                    })
                  }
                />
              </label>

              {error && (
                <div className="alert error">{error}</div>
              )}

              {notice && (
                <div className="alert success">
                  {notice}
                </div>
              )}

              <button
                className="btn primary full"
                type="submit"
              >
                {authMode === "login"
                  ? "Sign in"
                  : "Create account"}

                <ArrowRight size={17} />
              </button>
            </form>

            <div className="switch-auth">
              {authMode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}

              <button
                onClick={() => {
                  setAuthMode(
                    authMode === "login"
                      ? "signup"
                      : "login"
                  );

                  setError("");
                  setNotice("");
                }}
              >
                {authMode === "login"
                  ? "Sign up"
                  : "Sign in"}
              </button>
            </div>

            <p className="tiny-legal">
              SkyWays is an independent flight booking demo.
            </p>
          </div>
        </section>
      </div>
    );
  }

  // ---------- Main application ----------

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setPage("home")}
        >
          <span className="brand-mark">
            <Plane size={22} />
          </span>
          SKYWAYS
        </button>

        <button
          className="mobile-toggle"
          onClick={() => setMobileMenu(!mobileMenu)}
          aria-label="Toggle menu"
        >
          <Menu />
        </button>

        <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
          <button
            className={
              page === "home"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => {
              setPage("home");
              setMobileMenu(false);
            }}
          >
            Book flights
          </button>

          <button
            className={
              page === "bookings"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={openBookings}
          >
            My bookings
          </button>

          <button
            className="nav-item"
            onClick={() => {
              setChatOpen(true);
              setMobileMenu(false);
            }}
          >
            <MessageCircle size={16} />
            AI Assistant
          </button>
        </nav>

        <div className="profile-area">
          <span className="avatar">
            <User size={17} />
          </span>

          <span className="profile-name">
            {user.name}
          </span>

          <button
            className="icon-button"
            onClick={logout}
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main>
        {/* WELCOME PAGE */}

        {page === "home" && (
          <>
            <section className="hero">
              <div className="hero-content">
                <span className="hero-tag">
                  <Sparkles size={14} />
                  MAKE EVERY JOURNEY COUNT
                </span>

                <h1>
                  The world is waiting.
                  <br />
                  <em>Let's fly.</em>
                </h1>

                <p>
                  Find your next destination and make the
                  journey part of the adventure.
                </p>

                <button
                  className="btn white"
                  onClick={() =>
                    document
                      .getElementById("flight-search")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      })
                  }
                >
                  Explore flights
                  <ArrowRight size={17} />
                </button>
              </div>

              <div className="hero-plane">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <Plane size={200} strokeWidth={0.8} />

                <span className="floating-tag tag-one">
                  New destinations
                </span>

                <span className="floating-tag tag-two">
                  Your trip, simplified
                </span>
              </div>
            </section>

            <section
              className="search-wrap"
              id="flight-search"
            >
              <span className="section-kicker">
                PLAN YOUR TRIP
              </span>

              <h2>Where would you like to go?</h2>

              <form
                className="flight-search"
                onSubmit={searchFlights}
              >
                <label>
                  <span>
                    <MapPin size={15} /> FROM
                  </span>

                  <select
                    value={origin}
                    onChange={(event) =>
                      setOrigin(event.target.value)
                    }
                  >
                    {CITIES.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="swap-btn"
                  title="Swap cities"
                  onClick={() => {
                    setOrigin(destination);
                    setDestination(origin);
                  }}
                >
                  <ArrowRight size={17} />
                </button>

                <label>
                  <span>
                    <MapPin size={15} /> TO
                  </span>

                  <select
                    value={destination}
                    onChange={(event) =>
                      setDestination(event.target.value)
                    }
                  >
                    {CITIES.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>
                    <CalendarDays size={15} />
                    DEPARTURE
                  </span>

                  <input
                    type="date"
                    min={TODAY}
                    required
                    value={travelDate}
                    onChange={(event) =>
                      setTravelDate(event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>
                    <User size={15} /> PASSENGERS
                  </span>

                  <select
                    value={passengers}
                    onChange={(event) =>
                      setPassengers(event.target.value)
                    }
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
                      (number) => (
                        <option
                          key={number}
                          value={number}
                        >
                          {number}{" "}
                          {number === 1 ? "Adult" : "Adults"}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <button
                  className="btn primary search-btn"
                  type="submit"
                >
                  <Search size={18} />
                  Search flights
                </button>
              </form>
            </section>

            <section className="features">
              <div className="feature">
                <span className="feature-icon">
                  <Ticket />
                </span>

                <h3>Easy booking</h3>

                <p>
                  Find a sample flight and book in a few
                  simple steps.
                </p>
              </div>

              <div className="feature">
                <span className="feature-icon">
                  <ShieldCheck />
                </span>

                <h3>Clear prices</h3>

                <p>
                  See the demo fare before confirming your
                  booking.
                </p>
              </div>

              <div className="feature">
                <span className="feature-icon">
                  <MessageCircle />
                </span>

                <h3>Travel assistant</h3>

                <p>
                  Get quick answers from the built-in
                  assistant.
                </p>
              </div>
            </section>

            <section className="popular">
              <div>
                <span className="section-kicker">
                  A LITTLE INSPIRATION
                </span>

                <h2>Popular destinations</h2>

                <p className="muted">
                  Choose a destination to search sample
                  routes.
                </p>
              </div>

              <div className="destination-grid">
                {[
                  ["Bengaluru", "The garden city", "BLR"],
                  ["Mumbai", "The city that never sleeps", "BOM"],
                  ["Delhi", "History meets today", "DEL"],
                ].map((item, index) => (
                  <button
                    className={`destination-card dest-${index}`}
                    key={item[0]}
                    onClick={() => {
                      setOrigin("Belagavi");
                      setDestination(item[0]);
                      setPage("home");
                      document
                        .getElementById("flight-search")
                        ?.scrollIntoView({
                          behavior: "smooth",
                        });
                    }}
                  >
                    <span className="dest-code">
                      {item[2]}
                    </span>

                    <span className="dest-info">
                      <b>{item[0]}</b>
                      <small>{item[1]}</small>
                    </span>

                    <ArrowRight />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* FLIGHT RESULTS */}

        {page === "flights" && (
          <section className="content-page">
            <button
              className="back-link"
              onClick={() => setPage("home")}
            >
              ← Back to search
            </button>

            <span className="section-kicker">
              YOUR SEARCH RESULTS
            </span>

            <h1>Flights to {destination}</h1>

            <p className="muted">
              {origin} → {destination} · {travelDate} ·{" "}
              {passengers} passenger(s)
            </p>

            <div className="demo-banner">
              Demo schedules and fares only. These are
              not live airline flights.
            </div>

            {flights.length > 0 ? (
              <div className="flight-list">
                {flights.map((flight) => (
                  <article
                    className="flight-card"
                    key={flight.id}
                  >
                    <div className="airline-badge">
                      <Plane size={21} />
                    </div>

                    <div className="flight-times">
                      <div>
                        <b>{flight.depart}</b>
                        <span>{flight.from}</span>
                      </div>

                      <div className="duration">
                        <span />
                        <small>
                          <Clock3 size={12} />
                          {flight.duration}
                        </small>
                        <span />
                      </div>

                      <div>
                        <b>{flight.arrive}</b>
                        <span>{flight.to}</span>
                      </div>
                    </div>

                    <div className="flight-number">
                      <small>FLIGHT</small>
                      <b>{flight.flight_no}</b>
                      <small>{flight.seats} demo seats</small>
                    </div>

                    <div className="flight-price">
                      <small>FARE / PERSON</small>

                      <b>
                        ₹
                        {flight.price.toLocaleString("en-IN")}
                      </b>

                      <button
                        className="btn primary"
                        onClick={() => startBooking(flight)}
                      >
                        Select flight
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Plane size={35} />
                <h3>No demo flights found</h3>
                <p>Try searching another route.</p>

                <button
                  className="btn primary"
                  onClick={() => setPage("home")}
                >
                  Search again
                </button>
              </div>
            )}
          </section>
        )}

        {/* CHECKOUT */}

        {page === "checkout" && chosenFlight && (
          <section className="content-page">
            <button
              className="back-link"
              onClick={() => setPage("flights")}
            >
              ← Back to flights
            </button>

            <span className="section-kicker">
              ALMOST READY FOR TAKEOFF
            </span>

            <h1>Complete your booking</h1>

            <div className="checkout-grid">
              <form
                className="checkout-form"
                onSubmit={confirmBooking}
              >
                <div className="panel">
                  <h3>1. Passenger details</h3>

                  <label>
                    Passenger full name
                    <input
                      required
                      minLength="2"
                      value={passengerName}
                      onChange={(event) =>
                        setPassengerName(event.target.value)
                      }
                      placeholder="Name as on ID"
                    />
                  </label>

                  <label>
                    Travel date
                    <input
                      type="date"
                      required
                      min={TODAY}
                      value={travelDate}
                      onChange={(event) =>
                        setTravelDate(event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Number of passengers
                    <select
                      value={passengers}
                      onChange={(event) =>
                        setPassengers(event.target.value)
                      }
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
                        (number) => (
                          <option
                            key={number}
                            value={number}
                          >
                            {number}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <div className="panel">
                  <h3>2. Choose your demo seat</h3>

                  <p className="muted small">
                    Seat options are illustrative.
                  </p>

                  <div className="seat-grid">
                    {[
                      "12A", "12B", "12C",
                      "12D", "12E", "12F",
                      "14A", "14B", "14C",
                      "14D", "14E", "14F",
                    ].map((seatOption) => (
                      <button
                        type="button"
                        key={seatOption}
                        className={
                          seat === seatOption
                            ? "seat selected"
                            : "seat"
                        }
                        onClick={() => setSeat(seatOption)}
                      >
                        {seatOption}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <h3>3. Payment</h3>

                  <div className="demo-payment">
                    <CreditCard />

                    <div>
                      <b>Demo payment</b>
                      <p>
                        No card or UPI details are needed.
                        This checkout does not charge money.
                      </p>
                    </div>

                    <CheckCircle2 className="payment-check" />
                  </div>

                  <div className="alert info">
                    This is a demo confirmation, not a
                    real airline ticket.
                  </div>
                </div>

                {error && (
                  <div className="alert error">{error}</div>
                )}

                <button
                  className="btn primary full"
                  type="submit"
                >
                  Confirm demo booking · ₹
                  {total.toLocaleString("en-IN")}
                  <ArrowRight size={17} />
                </button>
              </form>

              <aside className="panel summary-panel">
                <span className="section-kicker">
                  FARE SUMMARY
                </span>

                <h3>{chosenFlight.flight_no}</h3>

                <div className="summary-route">
                  <div>
                    <b>{chosenFlight.depart}</b>
                    <span>{chosenFlight.from}</span>
                  </div>

                  <ArrowRight />

                  <div>
                    <b>{chosenFlight.arrive}</b>
                    <span>{chosenFlight.to}</span>
                  </div>
                </div>

                <p className="muted small">
                  {chosenFlight.duration} · Demo Air
                </p>

                <div className="summary-line">
                  <span>Fare per passenger</span>
                  <b>
                    ₹
                    {chosenFlight.price.toLocaleString("en-IN")}
                  </b>
                </div>

                <div className="summary-line">
                  <span>Passengers</span>
                  <b>× {passengers}</b>
                </div>

                <div className="summary-line">
                  <span>Taxes and fees</span>
                  <b>Included</b>
                </div>

                <div className="summary-total">
                  <span>Total demo fare</span>
                  <b>₹{total.toLocaleString("en-IN")}</b>
                </div>
              </aside>
            </div>
          </section>
        )}

        {/* BOOKING CONFIRMATION */}

        {page === "confirmation" && (
          <section className="content-page confirmation">
            <div className="confirm-icon">
              <CheckCircle2 size={46} />
            </div>

            <span className="section-kicker">
              BOOKING COMPLETE
            </span>

            <h1>Your demo booking is confirmed!</h1>

            <p className="muted">
              This is a prototype confirmation, not a
              real airline ticket.
            </p>

            {bookings[0] && (
              <div className="confirmation-ticket">
                <div>
                  <small>BOOKING REFERENCE</small>
                  <h2>{bookings[0].booking_reference}</h2>
                </div>

                <div>
                  <small>PASSENGER</small>
                  <b>{bookings[0].passenger_name}</b>
                </div>

                <div>
                  <small>TRAVEL DATE</small>
                  <b>{bookings[0].travel_date}</b>
                </div>

                <div>
                  <small>DEMO TOTAL</small>
                  <b>
                    ₹
                    {Number(
                      bookings[0].total_amount
                    ).toLocaleString("en-IN")}
                  </b>
                </div>
              </div>
            )}

            <div className="confirm-actions">
              <button
                className="btn primary"
                onClick={openBookings}
              >
                View my bookings
              </button>

              <button
                className="btn outline"
                onClick={() => setPage("home")}
              >
                Book another flight
              </button>
            </div>
          </section>
        )}

        {/* BOOKING HISTORY */}

        {page === "bookings" && (
          <section className="content-page">
            <span className="section-kicker">
              YOUR TRAVEL SPACE
            </span>

            <h1>My bookings</h1>

            <p className="muted">
              View and manage your demo reservations.
            </p>

            {bookings.length > 0 ? (
              <div className="booking-list">
                {bookings.map((booking) => (
                  <article
                    className="booking-card"
                    key={booking.id}
                  >
                    <div className="booking-icon">
                      <Plane />
                    </div>

                    <div className="booking-main">
                      <div className="booking-title">
                        <b>
                          {booking.flight?.from}
                          <ArrowRight size={15} />
                          {booking.flight?.to}
                        </b>

                        <span
                          className={
                            booking.booking_status === "CANCELLED"
                              ? "status cancelled"
                              : "status"
                          }
                        >
                          {booking.booking_status}
                        </span>
                      </div>

                      <p>
                        {booking.flight?.flight_no} ·{" "}
                        {booking.travel_date} · Seat{" "}
                        {booking.seat}
                      </p>

                      <small>
                        Reference: {booking.booking_reference}
                        {" · "}
                        {booking.passengers} passenger(s)
                      </small>
                    </div>

                    <div className="booking-side">
                      <b>
                        ₹
                        {Number(
                          booking.total_amount
                        ).toLocaleString("en-IN")}
                      </b>

                      {booking.booking_status !==
                        "CANCELLED" && (
                        <button
                          className="cancel-btn"
                          onClick={() =>
                            cancelBooking(booking.id)
                          }
                        >
                          Cancel booking
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Ticket size={36} />

                <h3>No bookings yet</h3>

                <p>
                  Your bookings will appear here after
                  you confirm a flight.
                </p>

                <button
                  className="btn primary"
                  onClick={() => setPage("home")}
                >
                  Find a flight
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      <footer>
        <button
          className="brand footer-brand"
          onClick={() => setPage("home")}
        >
          <span className="brand-mark">
            <Plane size={18} />
          </span>
          SKYWAYS
        </button>

        <span>
          © 2026 SkyWays Demo · Independent project
        </span>

        <span>Demo flights · Demo payments</span>
      </footer>

      {/* NOTIFICATIONS */}

      {(notice || error) && (
        <div
          className={`toast ${error ? "toast-error" : ""}`}
          role="status"
        >
          {error ? error : notice}

          <button
            onClick={() => {
              setNotice("");
              setError("");
            }}
            aria-label="Close notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* CHAT BUTTON */}

      <button
        className="chat-launcher"
        onClick={() => setChatOpen(true)}
        aria-label="Open flight assistant"
      >
        <MessageCircle size={22} />
        <span>Ask Flight Helper</span>
        <span className="online-dot" />
      </button>

      {/* CHAT WINDOW */}

      {chatOpen && (
        <aside className="chat-panel">
          <div className="chat-header">
            <div className="chat-avatar">
              <Sparkles size={20} />
            </div>

            <div>
             <b>Gemini AI Assistant</b>
             <small>AI-powered travel support</small>
            </div>

            <button
              onClick={() => setChatOpen(false)}
              aria-label="Close assistant"
            >
              <X />
            </button>
          </div>

          <div className="chat-body">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`chat-row ${message.role}`}
              >
                <div className="chat-bubble">
                  {message.text}
                </div>
              </div>
            ))}

            {chatBusy && (
              <div className="chat-bubble assistant typing">
                Thinking…
              </div>
            )}
          </div>

          <div className="quick-questions">
            {[
              "How do I book?",
              "Can I cancel?",
              "Is payment real?",
            ].map((question) => (
              <button
                key={question}
                onClick={() => setChatInput(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <form
            className="chat-compose"
            onSubmit={sendChat}
          >
            <input
              value={chatInput}
              onChange={(event) =>
                setChatInput(event.target.value)
              }
              placeholder="Ask about your journey..."
              maxLength="1000"
            />

            <button
              type="submit"
              disabled={chatBusy || !chatInput.trim()}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </aside>
      )}
    </div>
  );
}

export default App;