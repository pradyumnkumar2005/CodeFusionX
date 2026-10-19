
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GuestLayout from "./components/guestlayout/GuestLayout";
import UserLayout from "./components/userlayout/UserLayout";
import AdminLayout from "./components/adminlayout/AdminLayout";
import Home from "./components/guestlayout/Home";
import About from "./components/guestlayout/About";
import Services from "./components/guestlayout/Services";
import Contact from "./components/guestlayout/Contact";
import Login from "./components/guestlayout/Login";
import Register from "./components/guestlayout/Register";
import NotFound from "./components/guestlayout/NotFound";
import UserDashboard from "./components/userlayout/UserDashboard";
import FeedbackForm from "./components/userlayout/FeedbackForm";
import Profile from "./components/userlayout/Profile";
import AdminDashboard from "./components/adminlayout/AdminDashboard";
import UserFeedbacks from "./components/adminlayout/UserFeedbacks";
import AdminUsers from "./components/adminlayout/AdminUsers";
import ForgotPassword from "./components/guestlayout/ForgotPassword";
import AdminContacts from "./components/adminlayout/AdminContacts";
import EditorPage from "./components/userlayout/EditorPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route element={<GuestLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<UserLayout />}>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/feedback" element={<FeedbackForm />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/editor" element={<EditorPage />} />
        </Route>

        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/feedbacks" element={<UserFeedbacks />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/contacts" element={<AdminContacts />} />
        </Route>

        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
