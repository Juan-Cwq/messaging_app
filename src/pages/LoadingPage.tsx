import { motion } from "framer-motion";

const LoadingPage = () => {
  return (
    <main className="min-h-screen bg-base-100 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        {/* Logo */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="mb-6"
        >
          <img src="/haven-icon.svg" alt="Haven" className="h-16 w-16 mx-auto" />
        </motion.div>

        {/* Loading Text */}
        <h2 className="text-xl font-semibold mb-2">Haven</h2>
        <p className="text-base-content/60 text-sm mb-4">
          Establishing secure connection...
        </p>

        {/* Loading Spinner */}
        <span className="loading loading-dots loading-lg text-primary"></span>
      </motion.div>
    </main>
  );
};

export default LoadingPage;
