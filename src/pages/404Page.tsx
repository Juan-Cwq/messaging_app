import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HomeIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { Button } from "../components/ui";

const NotFoundPage = () => {
  return (
    <main className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-error/10">
            <ShieldExclamationIcon className="h-16 w-16 text-error" />
          </div>
        </div>

        {/* Error Text */}
        <h1 className="text-6xl font-bold mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Access Denied</h2>
        <p className="text-base-content/60 mb-8">
          This page doesn't exist or you don't have permission to access it.
          If you believe this is an error, please sign in to continue.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button leftIcon={<HomeIcon className="h-4 w-4" />}>
              Go Home
            </Button>
          </Link>
          <Link to="/auth/sign-in">
            <Button variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </motion.div>
    </main>
  );
};

export default NotFoundPage;
