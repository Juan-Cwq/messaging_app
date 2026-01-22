import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { Button } from "./Button";

interface RecoveryKeyDisplayProps {
  recoveryKey: string;
  username: string;
  onConfirm: () => void;
}

export const RecoveryKeyDisplay = ({
  recoveryKey,
  username,
  onConfirm,
}: RecoveryKeyDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const copyToClipboard = async () => {
    const text = `Haven Recovery Key\n\nUsername: ${username}\nRecovery Key: ${recoveryKey}\n\nStore this information in a safe place. You will need it to recover your account if you forget your password.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const downloadKey = () => {
    const content = `Haven Recovery Key
==================

Username: ${username}
Recovery Key: ${recoveryKey}

IMPORTANT: Store this file in a safe place.
You will need this recovery key if you forget your password.
Do not share this key with anyone.

Generated: ${new Date().toISOString()}
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haven-recovery-${username}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSaved(true);
  };

  const canConfirm = copied || saved;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Warning Banner */}
      <div className="alert alert-warning">
        <ExclamationTriangleIcon className="h-6 w-6" />
        <div>
          <h3 className="font-bold">Save Your Recovery Key</h3>
          <p className="text-sm">
            This is the only way to recover your account. Store it safely.
          </p>
        </div>
      </div>

      {/* Recovery Key Box */}
      <div className="bg-base-200 rounded-xl p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-base-content/60 uppercase tracking-wider">
            Your Username
          </label>
          <p className="font-mono text-lg">{username}</p>
        </div>

        <div className="divider my-2"></div>

        <div className="space-y-2">
          <label className="text-xs text-base-content/60 uppercase tracking-wider">
            Recovery Key
          </label>
          <div className="bg-base-300 rounded-lg p-4">
            <p className="font-mono text-lg tracking-wider text-center break-all">
              {recoveryKey}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={copyToClipboard}
          leftIcon={
            copied ? (
              <CheckIcon className="h-4 w-4 text-success" />
            ) : (
              <ClipboardDocumentIcon className="h-4 w-4" />
            )
          }
        >
          {copied ? "Copied!" : "Copy"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={downloadKey}
          leftIcon={
            saved ? (
              <CheckIcon className="h-4 w-4 text-success" />
            ) : (
              <DocumentArrowDownIcon className="h-4 w-4" />
            )
          }
        >
          {saved ? "Downloaded!" : "Download"}
        </Button>
      </div>

      {/* Confirmation */}
      <div className="space-y-3">
        <p className="text-sm text-base-content/60 text-center">
          {canConfirm
            ? "Great! Click continue to complete setup."
            : "Please copy or download your recovery key first."}
        </p>

        <Button
          type="button"
          fullWidth
          size="lg"
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          I've Saved My Recovery Key
        </Button>
      </div>

      {/* Security Notice */}
      <div className="text-xs text-base-content/40 space-y-1">
        <p>• Your recovery key is generated locally and never sent to our servers</p>
        <p>• We cannot recover your account without this key</p>
        <p>• Consider storing it in a password manager</p>
      </div>
    </motion.div>
  );
};

export default RecoveryKeyDisplay;
