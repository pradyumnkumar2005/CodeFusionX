
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";
import GuestFooter from "../guestlayout/GuestFooter";
import API from "../../axiosConfig";

function AdminLayout() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await API.get("/auth/me");
        if (res.data.role !== "admin") { navigate("/"); return; }
        setAuthorized(true);
      } catch {
        setAuthorized(false);
        navigate("/login");
      }
    };
    check();
  }, [navigate]);

  if (authorized === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-main)" }}>
        <div style={{ width: "40px", height: "40px", border: "4px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}>
      <div style={{ position: "fixed", top: 0, width: "100%", zIndex: 50 }}>
        <AdminNavbar />
      </div>
      <div style={{ flex: 1, paddingTop: "64px" }}>
        <Outlet />
      </div>
      <GuestFooter />
    </div>
  );
}

export default AdminLayout;
