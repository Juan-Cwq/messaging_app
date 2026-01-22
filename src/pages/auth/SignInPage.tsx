import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeftIcon, LockClosedIcon, UserIcon } from "@heroicons/react/24/outline";
import { useSession } from "../../context/SessionContext";
import supabase from "../../supabase";
import { Button, Input, Card, CardHeader, CardContent, CardFooter, ThemeToggle } from "../../components/ui";
import { usernameToPseudoEmail } from "../../lib/identity";

const SignInPage = () => {
  const { session } = useSession();

  // If user is already logged in, redirect to home
  if (session) return <Navigate to="/" />;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formValues, setFormValues] = useState({
    username: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Convert username to pseudo-email for Supabase
    const pseudoEmail = usernameToPseudoEmail(formValues.username);

    const { error } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password: formValues.password,
    });

    if (error) {
      // Provide user-friendly error messages
      if (error.message.includes("Invalid login credentials")) {
        setError("Invalid username or password");
      } else {
        setError(error.message);
      }
    }
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-base-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 max-w-6xl mx-auto w-full">
        <Link
          to="/"
          className="btn btn-ghost gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Home
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <section className="w-full max-w-lg mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card variant="bordered" padding="lg">
            <CardHeader>
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <LockClosedIcon className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold">Welcome Back</h1>
                </div>
                <p className="text-base text-base-content/60 ml-1">
                  Sign in with your anonymous identity
                </p>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  name="username"
                  type="text"
                  label="Username"
                  placeholder="Your anonymous username"
                  value={formValues.username}
                  onChange={handleInputChange}
                  required
                  autoComplete="username"
                  leftIcon={<UserIcon className="h-5 w-5" />}
                />

                <Input
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  value={formValues.password}
                  onChange={handleInputChange}
                  required
                  autoComplete="current-password"
                  error={error}
                />

                <Button
                  type="submit"
                  fullWidth
                  isLoading={isLoading}
                  size="lg"
                >
                  Sign In
                </Button>

                {/* Recovery Option */}
                <div className="text-center">
                  <Link
                    to="/auth/recover"
                    className="text-sm text-base-content/60 hover:text-primary transition-colors"
                  >
                    Forgot password? Use recovery key
                  </Link>
                </div>
              </form>
            </CardContent>

            <CardFooter className="justify-center">
              <p className="text-sm text-base-content/60">
                Don't have an account?{" "}
                <Link
                  to="/auth/sign-up"
                  className="text-primary hover:underline font-medium"
                >
                  Create one
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Security Notice */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-xs text-base-content/40 mt-6"
          >
            Your connection is end-to-end encrypted
          </motion.p>
        </motion.div>
      </section>
    </main>
  );
};

export default SignInPage;
