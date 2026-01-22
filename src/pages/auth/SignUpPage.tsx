import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftIcon, ShieldCheckIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useSession } from "../../context/SessionContext";
import supabase from "../../supabase";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  ThemeToggle,
  IdentityGenerator,
  PasswordStrength,
  RecoveryKeyDisplay,
} from "../../components/ui";
import { usernameToPseudoEmail, generateRecoveryKey, validateUsername } from "../../lib/identity";
import { validatePassword, checkPasswordRequirements } from "../../lib/password";

type Step = "identity" | "password" | "recovery" | "complete";

const SignUpPage = () => {
  const { session } = useSession();

  // If user is already logged in, redirect to home
  if (session) return <Navigate to="/" />;

  const [step, setStep] = useState<Step>("identity");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");

  const handleIdentitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateUsername(username);
    if (!validation.valid) {
      setError(validation.error || "Invalid username");
      return;
    }
    setError("");
    setStep("password");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || "Invalid password");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    // Generate recovery key before showing it
    const newRecoveryKey = generateRecoveryKey();
    setRecoveryKey(newRecoveryKey);
    setStep("recovery");
  };

  const handleRecoveryConfirm = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Convert username to pseudo-email for Supabase
      const pseudoEmail = usernameToPseudoEmail(username);

      // Sign up with Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: pseudoEmail,
        password: password,
        options: {
          data: {
            username: username,
            recovery_key_hash: await hashRecoveryKey(recoveryKey),
          },
        },
      });

      if (signUpError) {
        // Handle specific errors
        if (signUpError.message.includes("already registered")) {
          setError("This username is already taken. Please choose another.");
          setStep("identity");
        } else {
          setError(signUpError.message);
        }
        setIsLoading(false);
        return;
      }

      if (data.user) {
        setStep("complete");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  // Simple hash function for recovery key (in production, use a proper hash)
  const hashRecoveryKey = async (key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const requirements = checkPasswordRequirements(password);
  const allRequirementsMet = requirements.filter((r) => r.met).length >= 3;

  // Step indicator
  const steps = [
    { id: "identity", label: "Identity" },
    { id: "password", label: "Password" },
    { id: "recovery", label: "Recovery" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <main className="min-h-screen bg-base-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 max-w-6xl mx-auto w-full">
        <Link to="/" className="btn btn-ghost gap-2">
          <ArrowLeftIcon className="h-4 w-4" />
          Home
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <section className="w-full max-w-xl mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full"
        >
          {step !== "complete" && (
            <>
              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {steps.map((s, index) => (
                  <div key={s.id} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${index <= currentStepIndex
                        ? "bg-primary text-primary-content"
                        : "bg-base-300 text-base-content/40"
                        }`}
                    >
                      {index + 1}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-12 h-0.5 mx-1 transition-colors ${index < currentStepIndex ? "bg-primary" : "bg-base-300"
                          }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <Card variant="bordered" padding="lg">
                <AnimatePresence mode="wait">
                  {/* Step 1: Identity */}
                  {step === "identity" && (
                    <motion.div
                      key="identity"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <UserPlusIcon className="h-6 w-6 text-primary" />
                          </div>
                          <CardTitle as="h1">Create Identity</CardTitle>
                        </div>
                        <p className="text-sm text-base-content/60 mt-1">
                          Choose an anonymous username. No email or phone required.
                        </p>
                      </CardHeader>

                      <CardContent>
                        <form onSubmit={handleIdentitySubmit} className="space-y-6">
                          <IdentityGenerator
                            value={username}
                            onChange={setUsername}
                            error={error}
                          />

                          <Button
                            type="submit"
                            fullWidth
                            size="lg"
                            disabled={!username}
                          >
                            Continue
                          </Button>
                        </form>
                      </CardContent>
                    </motion.div>
                  )}

                  {/* Step 2: Password */}
                  {step === "password" && (
                    <motion.div
                      key="password"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ShieldCheckIcon className="h-6 w-6 text-primary" />
                          </div>
                          <CardTitle as="h1">Secure Password</CardTitle>
                        </div>
                        <p className="text-sm text-base-content/60 mt-1">
                          Create a strong password to protect your account.
                        </p>
                      </CardHeader>

                      <CardContent>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                          {/* Show selected username */}
                          <div className="bg-base-200 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-sm text-base-content/60">Username</span>
                            <span className="font-medium">{username}</span>
                          </div>

                          <Input
                            name="password"
                            type="password"
                            label="Password"
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setError("");
                            }}
                            required
                            autoComplete="new-password"
                          />

                          <PasswordStrength password={password} />

                          <Input
                            name="confirmPassword"
                            type="password"
                            label="Confirm Password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setError("");
                            }}
                            required
                            autoComplete="new-password"
                            error={error}
                          />

                          <div className="flex gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setStep("identity")}
                            >
                              Back
                            </Button>
                            <Button
                              type="submit"
                              fullWidth
                              size="lg"
                              disabled={!password || !confirmPassword || !allRequirementsMet}
                            >
                              Continue
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </motion.div>
                  )}

                  {/* Step 3: Recovery Key */}
                  {step === "recovery" && (
                    <motion.div
                      key="recovery"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <CardHeader>
                        <CardTitle as="h1">Recovery Key</CardTitle>
                        <p className="text-sm text-base-content/60 mt-1">
                          Save this key to recover your account if you forget your password.
                        </p>
                      </CardHeader>

                      <CardContent>
                        {error && (
                          <div className="alert alert-error mb-4">
                            <span>{error}</span>
                          </div>
                        )}

                        <RecoveryKeyDisplay
                          recoveryKey={recoveryKey}
                          username={username}
                          onConfirm={handleRecoveryConfirm}
                        />

                        {isLoading && (
                          <div className="flex justify-center mt-4">
                            <span className="loading loading-spinner loading-md"></span>
                          </div>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>

                {step !== "recovery" && (
                  <CardFooter className="justify-center">
                    <p className="text-sm text-base-content/60">
                      Already have an account?{" "}
                      <Link
                        to="/auth/sign-in"
                        className="text-primary hover:underline font-medium"
                      >
                        Sign in
                      </Link>
                    </p>
                  </CardFooter>
                )}
              </Card>
            </>
          )}

          {/* Complete State */}
          {step === "complete" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card variant="bordered" padding="lg" className="text-center">
                <CardContent>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-success/10">
                      <ShieldCheckIcon className="h-12 w-12 text-success" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Welcome to Haven</h2>
                  <p className="text-base-content/60 mb-2">
                    Your anonymous account has been created.
                  </p>
                  <p className="text-sm text-base-content/40 mb-6">
                    Username: <span className="font-mono font-medium">{username}</span>
                  </p>
                  <Link to="/">
                    <Button fullWidth size="lg">
                      Enter Haven
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Security Notice */}
          {step !== "complete" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center text-xs text-base-content/40 mt-6"
            >
              No personal information required. Your identity is yours alone.
            </motion.p>
          )}
        </motion.div>
      </section>
    </main>
  );
};

export default SignUpPage;
