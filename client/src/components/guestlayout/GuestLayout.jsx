
import { Outlet } from "react-router-dom";
import GuestNavbar from "./GuestNavbar";
import GuestFooter from "./GuestFooter";

function GuestLayout() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-main)", color: "var(--text-main)" }}>
      <GuestNavbar />
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
      <GuestFooter />
    </div>
  );
}

export default GuestLayout;
