// [IMPORT] Hooks
import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// [IMPORT] Components
import Modal from "../../components/Modal";
import InputField from "../../components/InputField";
import ImageHeader from "../../components/ImageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";
import PrimaryButton from "../../components/PrimaryButton";

const CashierLogin = () => {
  const navigate = useNavigate();
  usePageTitle("Cashier Login | Happy-Pill Cafe");

  // [STATES]
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [isCancelable, setIsCancelable] = useState(true);
  const [redirectOnConfirm, setRedirectOnConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

// [HANDLE] Login cashier
const handleLogin = async () => {
    // ! [ERROR] Empty email
    if (email.trim() === "") {
      setModalTitle("Email required");
      setModalMessage("Please enter your email to continue.");
      setIsCancelable(false);
      setRedirectOnConfirm(false);
      setShowModal(true);
      return;
    }

    // ! [ERROR] Invalid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setModalTitle("Invalid Email");
      setModalMessage("Please enter a valid email address.");
      setIsCancelable(false);
      setRedirectOnConfirm(false);
      setShowModal(true);
      return;
    }

    // ! [ERROR] Empty password
    if (!password) {
      setModalTitle("Password required");
      setModalMessage("Please enter your password to continue.");
      setIsCancelable(false);
      setRedirectOnConfirm(false);
      setShowModal(true);
      return;
    }

    const payload = {
      email,
      password,
      rememberMe,
    };

    const token = localStorage.getItem("token");

    try {
      // [REQUEST] Send login request to backend
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/cashier/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // ! [ERROR] Login failed
      if (!res.ok || !data.success) {
        setModalTitle("Login unsuccessful");
        setModalMessage("We couldn't log you in. Please check your email and password and try again.");
        setIsCancelable(false);
        setRedirectOnConfirm(false);
        setShowModal(true);
        return;
      }

      // * [SUCCESS] Store token and role
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("role", "Cashier");

      setModalTitle("Login successful");
      setModalMessage("You have successfully signed in. Redirecting you to your dashboard...");
      setIsCancelable(false);
      setRedirectOnConfirm(true);
      setShowModal(true);

    } catch (err) {
      // ! [ERROR] Network or server issue
      console.error(err);
      setModalTitle("Login unsuccessful");
      setModalMessage("Something went wrong while trying to sign you in. Please check your internet connection and try again.");
      setIsCancelable(false);
      setRedirectOnConfirm(false);
      setShowModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* [COMPONENT] Image Header */}
      <ImageHeader />

      {/* [CONTENT] Page Body */}
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        {/* [COMPONENT] Modal */}
        {showModal && (
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={() => {
              setShowModal(false);
              if (redirectOnConfirm) navigate("/cashier/dashboard");
            }}
            title={modalTitle}
            message={modalMessage}
            closeOnBackdrop={false}
            isCancelable={isCancelable}
          />
        )}

        {/* Login Form */}
        <div className="bg-bg-100 w-full max-w-md sm:max-w-lg lg:max-w-md px-6 py-8 sm:px-8 sm:py-10 rounded-xl shadow-lg">
          {/* [UI] Form Title */}
          <h1 className="text-text-900 text-center text-2xl sm:text-2xl">
            Cashier Login
          </h1>

          {/* [SECTION] Input Fields */}
          <div className="flex flex-col gap-y-4 mt-6 mb-2">
            <InputField
              label="Email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. example@domain.com"
              iconSrc="email-icon.svg"
            />

            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              iconSrc="password-icon.svg"
            />
          </div>

          {/* [SECTION] Auxiliary Actions */}
          <div className="flex justify-between sm:flex-row sm:justify-between sm:items-center gap-3 mt-4 mb-8">
            <label className="flex items-center gap-2 text-caption text-gray-900">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary-600"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember Me
            </label>

            <a
              href={`/forgot-password?role=admin`}
              className="text-caption text-primary-800 hover:underline"
            >
              Forgot Password?
            </a>
          </div>

          {/* [PRIMARY BUTTON] Login */}
          <PrimaryButton text="Login" onClick={handleLogin} />

          {/* [SECTION] Navigate > Admin Login */}
          <div className="flex justify-center mt-5">
            <p className="text-caption text-center">
              Not a Cashier?{" "}
              <a
                href="/login/admin"
                className="link text-primary-600 hover:underline"
              >
                Login as Admin
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierLogin;