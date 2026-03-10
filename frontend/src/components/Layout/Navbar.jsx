import React, { useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { UserContext } from "../../context/Usercontext";
import "./Navbar.css";

const Navbar = () => {
  const { clearUser } = useContext(UserContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearUser();
    navigate("/login");
  };

  return (
    <nav className="app-navbar">
      <div className="app-navbar__inner">
        <Link to="/" className="app-navbar__brand">
          <div className="app-navbar__logo">AI</div>
          <span>Interview Prep AI</span>
        </Link>

        <div className="app-navbar__links">
          <Link
            to="/dashboard"
            className={`app-navbar__link ${location.pathname === "/dashboard" ? "active" : ""}`}
          >
            Dashboard
          </Link>
          <button className="app-navbar__logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
