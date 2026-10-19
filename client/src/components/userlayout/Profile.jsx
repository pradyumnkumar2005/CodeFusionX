
import { useEffect, useState } from "react";
import API from "../../axiosConfig";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [nameForm, setNameForm] = useState({ name: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [picMsg, setPicMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    API.get("/auth/me").then((r) => { setUser(r.data); setNameForm({ name: r.data.name }); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!nameForm.name.trim()) { setProfileMsg({ type: "error", text: "Name is required." }); return; }
    setSaving(true); setProfileMsg({ type: "", text: "" });
    try {
      const res = await API.put("/auth/profile", { name: nameForm.name, email: user.email });
      setUser(res.data.user);
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.message || "Failed to update." });
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordMsg({ type: "error", text: "All fields are required." }); return; }
    if (newPassword.length < 8) { setPasswordMsg({ type: "error", text: "Min 8 characters." }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: "error", text: "Passwords do not match." }); return; }
    setChangingPassword(true); setPasswordMsg({ type: "", text: "" });
    try {
      await API.put("/auth/change-password", { currentPassword, newPassword });
      setPasswordMsg({ type: "success", text: "Password changed successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.response?.data?.message || "Failed to change password." });
    } finally { setChangingPassword(false); }
  };

  
  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setPicMsg({ type: "error", text: "JPG, PNG or WEBP only." }); return; }
    if (file.size > 5 * 1024 * 1024) { setPicMsg({ type: "error", text: "Max 5MB." }); return; }
    const formData = new FormData();
    formData.append("profilePic", file);
    setUploadingPic(true); setPicMsg({ type: "", text: "" });
    try {
      const res = await API.put("/auth/profile-pic", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setUser(res.data.user);
      setPicMsg({ type: "success", text: "Profile picture updated." });
    } catch (err) {
      setPicMsg({ type: "error", text: err.response?.data?.message || "Upload failed." });
    } finally { setUploadingPic(false); }
  };
  

  const msgStyle = (type) => ({
    padding: "12px 16px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px",
    backgroundColor: type === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
    border: `1px solid ${type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
    color: type === "success" ? "#10b981" : "#ef4444",
  });

  const inputStyle = { width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", fontSize: "14px", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" };
  const cardStyle = { backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "36px", marginBottom: "24px" };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "4px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px" }}>

      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "40px" }}>
        
        <div style={{ position: "relative" }}>
          {user?.profilePic ? (
            <img src={user.profilePic} alt="Profile" style={{ width: "72px", height: "72px", borderRadius: "18px", objectFit: "cover", border: "2px solid var(--border)" }} />
          ) : (
            <div style={{ width: "72px", height: "72px", backgroundColor: "var(--primary)", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "22px", fontWeight: "900" }}>{initials}</div>
          )}
          <label htmlFor="picInput" style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "26px", height: "26px", backgroundColor: "var(--primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
          >
            <svg style={{ width: "12px", height: "12px", color: "#fff" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
            </svg>
          </label>
          <input id="picInput" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProfilePicChange} style={{ display: "none" }} />
        </div>
        
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "4px" }}>{user?.name}</h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>
            {user?.email} ·{" "}
            <span style={{ color: "var(--primary)", fontWeight: "600", textTransform: "capitalize" }}>{user?.role}</span>
          </p>
          
          {uploadingPic && <p style={{ fontSize: "12px", color: "var(--primary)", marginTop: "6px" }}>Uploading...</p>}
          {picMsg.text && <p style={{ fontSize: "12px", marginTop: "6px", color: picMsg.type === "success" ? "#10b981" : "#ef4444" }}>{picMsg.text}</p>}
          
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-main)", marginBottom: "6px" }}>Personal Information</h2>
        <p style={{ fontSize: "13px", color: "var(--text-faint)", marginBottom: "24px" }}>Update your name. Email cannot be changed.</p>
        {profileMsg.text && <div style={msgStyle(profileMsg.type)}>{profileMsg.type === "success" ? "✅" : "⚠️"} {profileMsg.text}</div>}
        <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Full name</label>
            <input value={nameForm.name} onChange={(e) => setNameForm({ name: e.target.value })} placeholder="John Doe" required style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Email <span style={{ color: "var(--text-faint)", fontWeight: "400" }}>(cannot be changed)</span></label>
            <input value={user?.email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Role</label>
            <span style={{ display: "inline-block", padding: "4px 14px", backgroundColor: "var(--primary-light)", color: "var(--primary)", fontSize: "12px", fontWeight: "700", borderRadius: "999px", textTransform: "capitalize", alignSelf: "flex-start" }}>{user?.role}</span>
          </div>
          <button type="submit" disabled={saving}
            style={{ alignSelf: "flex-start", padding: "11px 28px", borderRadius: "10px", border: "none", cursor: "pointer", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "700", fontSize: "14px", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-main)", marginBottom: "6px" }}>Change Password</h2>
        <p style={{ fontSize: "13px", color: "var(--text-faint)", marginBottom: "24px" }}>Must be at least 8 characters.</p>
        {passwordMsg.text && <div style={msgStyle(passwordMsg.type)}>{passwordMsg.type === "success" ? "✅" : "⚠️"} {passwordMsg.text}</div>}
        <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {[
            { field: "current", label: "Current password", key: "currentPassword" },
            { field: "new", label: "New password", key: "newPassword" },
            { field: "confirm", label: "Confirm new password", key: "confirmPassword" },
          ].map(({ field, label, key }) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>{label}</label>
              <div style={{ position: "relative" }}>
                <input type={showPasswords[field] ? "text" : "password"} value={passwordForm[key]}
                  onChange={(e) => setPasswordForm({ ...passwordForm, [key]: e.target.value })} placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: "60px" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, [field]: !p[field] }))}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "var(--text-faint)" }}>
                  {showPasswords[field] ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={changingPassword}
            style={{ alignSelf: "flex-start", padding: "11px 28px", borderRadius: "10px", cursor: "pointer", backgroundColor: "var(--bg-secondary)", color: "var(--text-main)", border: "1px solid var(--border)", fontWeight: "700", fontSize: "14px", opacity: changingPassword ? 0.6 : 1 }}>
            {changingPassword ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

    </div>
  );
}

export default Profile;
