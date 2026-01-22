import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheckIcon, LockClosedIcon, UserPlusIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { useSession } from "../context/SessionContext";
import supabase from "../supabase";
import { Button, Card, CardContent, ThemeToggle } from "../components/ui";
import { pseudoEmailToUsername } from "../lib/identity";

const HomePage = () => {
  const { session } = useSession();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen bg-base-100">
      {/* Header */}
      <header className="flex items-center justify-between p-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img src="/haven-icon.svg" alt="Haven" className="h-8 w-8" />
          <span className="font-display text-xl font-semibold">Haven</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          ) : (
            <Link to="/auth/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-display text-5xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tighter leading-none">
            <span className="text-haven-gradient">Private</span> Communication
            <br />
            <span className="text-base-content">For Everyone</span>
          </h1>

          <p className="text-base md:text-lg text-base-content/60 max-w-4xl mx-auto mb-12 leading-relaxed">
            Haven is a sanctuary for secure messaging. End-to-end encrypted, anonymous, and built for those who value their privacy.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {session ? (
              <Link to="/protected">
                <Button size="lg" rightIcon={<ArrowRightIcon className="h-5 w-5" />}>
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth/sign-up">
                  <Button size="lg" rightIcon={<UserPlusIcon className="h-5 w-5" />}>
                    Get Started
                  </Button>
                </Link>
                <Link to="/auth/sign-in">
                  <Button variant="outline" size="lg">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </motion.div>

        {/* User Info (if logged in) */}
        {session && (() => {
          const username = session.user.user_metadata?.username ||
            pseudoEmailToUsername(session.user.email || "");
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-12 max-w-md mx-auto"
            >
              <Card variant="bordered">
                <CardContent className="flex items-center gap-4">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-12">
                      <span className="text-lg">
                        {username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{username}</p>
                    <p className="text-sm text-base-content/60">Secure session active</p>
                  </div>
                  <div className="badge badge-success gap-1">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    Online
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 mt-20"
        >
          <Card variant="ghost" padding="lg" className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <LockClosedIcon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">End-to-End Encrypted</h3>
            <p className="text-base-content/60 text-sm">
              Your messages are encrypted before they leave your device.
              Only you and your recipient can read them.
            </p>
          </Card>

          <Card variant="ghost" padding="lg" className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <ShieldCheckIcon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Anonymous by Design</h3>
            <p className="text-base-content/60 text-sm">
              No phone number required. Create an account with just a
              username and password.
            </p>
          </Card>

          <Card variant="ghost" padding="lg" className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Disappearing Messages</h3>
            <p className="text-base-content/60 text-sm">
              Set messages to automatically delete. Leave no trace of
              your conversations.
            </p>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-base-300 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-base-content/40">
          <p>Haven — Your conversations are yours alone.</p>
        </div>
      </footer>
    </main>
  );
};

export default HomePage;
