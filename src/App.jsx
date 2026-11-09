import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import {
  About,
  Contact,
  Experience,
  /* Feedbacks, */
  Hero,
  Navbar,
  Tech,
  Works,
  StarsCanvas,
} from "./components";
import RequireAuth from "./hoc/RequireAuth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";

const Landing = () => (
  <div className="relative z-0 bg-primary">
    <div className="bg-hero-pattern bg-cover bg-no-repeat bg-center">
      <Navbar />
      <Hero />
    </div>
    <StarsCanvas />
    <About />
    <Experience />
    <Tech />
    <Works />
    {/* <Feedbacks /> */}
    <div className="relative z-0">
      <Contact />
    </div>
  </div>
);

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth requiredRole="admin">
              <Admin />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
