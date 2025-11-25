import { useState, useEffect, type FormEvent } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { verifyResetTokenRequest, resetPasswordRequest } from "../api/auth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setValidating(false);
        return;
      }

      try {
        const result = await verifyResetTokenRequest(token);
        setTokenValid(result.valid);
      } catch {
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await resetPasswordRequest(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Password reset failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-2xl text-center">
          <div className="text-zinc-600">Validating reset token...</div>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-zinc-900">
              <span className="text-cyan-500">Beamer</span> CMS
            </h1>
            <p className="text-zinc-500 mt-2">Invalid Reset Link</p>
          </div>

          <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
            <p className="text-sm text-red-700">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
          </div>

          <Link
            to="/forgot-password"
            className="block w-full py-2 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-md transition-colors text-center"
          >
            Request New Reset Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">
            <span className="text-cyan-500">Beamer</span> CMS
          </h1>
          <p className="text-zinc-500 mt-2">Set your new password</p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                Your password has been reset successfully. Redirecting to login...
              </p>
            </div>

            <Link
              to="/login"
              className="block w-full py-2 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-md transition-colors text-center"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Enter new password (min 8 characters)"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <Link
              to="/login"
              className="block text-center text-sm text-cyan-600 hover:text-cyan-700"
            >
              Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
