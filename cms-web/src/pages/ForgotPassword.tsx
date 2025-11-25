import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordRequest } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await forgotPasswordRequest(email);
      setSuccess(true);
      if (result.devOnly?.resetToken) {
        setResetToken(result.devOnly.resetToken);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Request failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">
            <span className="text-cyan-500">Beamer</span> CMS
          </h1>
          <p className="text-zinc-500 mt-2">Reset your password</p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">
                If an account exists for {email}, a password reset link has been generated.
              </p>
            </div>
            
            {resetToken && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs font-semibold text-amber-800 mb-1 uppercase">Development Mode Only</p>
                <p className="text-sm text-amber-700 mb-2">
                  Email service is not configured. Use this link to reset your password:
                </p>
                <Link 
                  to={`/reset-password?token=${resetToken}`}
                  className="text-amber-600 hover:text-amber-800 underline break-all text-sm"
                >
                  Click here to reset password
                </Link>
              </div>
            )}

            <Link
              to="/login"
              className="block w-full py-2 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-md transition-colors text-center"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="Enter your email address"
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
              {loading ? "Sending..." : "Send Reset Link"}
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
