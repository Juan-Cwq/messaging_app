import React, { useEffect, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { useChat } from '../context/ChatContext';
import { exportKey } from '../lib/crypto';
import supabase from '../supabase';
import toast from 'react-hot-toast';

const THEMES = [
    { id: 'light', name: 'Haven Light', icon: '☀️' },
    { id: 'dark', name: 'Haven Dark', icon: '🌙' },
    { id: 'cyberpunk', name: 'Cyberpunk', icon: '🤖' },
    { id: 'synthwave', name: 'Synthwave', icon: '🌆' },
    { id: 'retro', name: 'Retro', icon: '📼' },
    { id: 'aqua', name: 'Aqua', icon: '💧' },
    { id: 'luxury', name: 'Luxury', icon: '💎' },
    { id: 'dracula', name: 'Dracula', icon: '🦇' },
];

export default function SettingsPage() {
    const { session } = useSession();
    const { conversations, messages } = useChat();
    const [currentTheme, setCurrentTheme] = useState('light');

    useEffect(() => {
        const saved = localStorage.getItem('theme') || 'light';
        setCurrentTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    const changeTheme = (theme: string) => {
        setCurrentTheme(theme);
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
        toast.success(`Theme changed to ${theme}`);
    };

    const handleExportData = async () => {
        try {
            const exportData = {
                user: session?.user,
                timestamp: new Date().toISOString(),
                conversations: conversations,
                // Note: In a real app we'd fetch ALL messages first, not just what's in context/state.
                // For this demo, we'll just export what we have loaded or warn.
                // Ideally we should have a `fetchAllMessages` function.
                messages: messages
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `haven_backup_${new Date().toLocaleDateString()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Backup downloaded!");
        } catch (e: any) {
            toast.error("Export failed: " + e.message);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-display font-bold text-base-content mb-2">Settings</h1>
                <p className="text-base-content/60">Manage your preferences and data.</p>
            </div>

            {/* Theme Section */}
            <section className="card bg-base-100 shadow-xl p-6 border border-base-300">
                <h2 className="text-xl font-bold mb-4">Appearance</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {THEMES.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => changeTheme(theme.id)}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2
                            ${currentTheme === theme.id ? 'border-primary bg-primary/10' : 'border-base-200 hover:border-base-300'}
                        `}
                        >
                            <span className="text-2xl">{theme.icon}</span>
                            <span className="font-medium text-sm">{theme.name}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Profile Section */}
            <section className="card bg-base-100 shadow-xl p-6 border border-base-300">
                <h2 className="text-xl font-bold mb-4">Profile</h2>
                <div className="flex flex-col gap-4 max-w-md">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Display Name</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="username"
                                className="input input-bordered flex-1"
                                defaultValue={session?.user.user_metadata?.username || ''}
                                onChange={async (e) => {
                                    // Debounce or save on blur? Let's add a save button instead.
                                }}
                                id="username-input"
                            />
                            <button
                                className="btn btn-primary"
                                onClick={async () => {
                                    const input = document.getElementById('username-input') as HTMLInputElement;
                                    const newName = input.value.trim();
                                    if (!newName) return;

                                    const toastId = toast.loading("Updating profile...");
                                    const { error } = await supabase.auth.updateUser({
                                        data: { username: newName }
                                    });

                                    if (error) toast.error(error.message, { id: toastId });
                                    else {
                                        toast.success("Profile updated!", { id: toastId });
                                        // Update public profile table too
                                        await supabase.from('profiles').update({ username: newName }).eq('id', session?.user.id);
                                    }
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Data Section */}
            <section className="card bg-base-100 shadow-xl p-6 border border-base-300">
                <h2 className="text-xl font-bold mb-4">Data & Security</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                        <div>
                            <h3 className="font-bold">Export Chat History</h3>
                            <p className="text-sm opacity-70">Download a decrypted copy of your messages.</p>
                        </div>
                        <button onClick={handleExportData} className="btn btn-primary">
                            Export JSON
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                        <div>
                            <h3 className="font-bold text-error">Danger Zone</h3>
                            <p className="text-sm opacity-70">Clear local keys (Will lose access to encrypted messages!)</p>
                        </div>
                        <button
                            onClick={() => {
                                if (confirm("Are you sure? YOU WILL LOSE ACCESS TO MESSAGES.")) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                            className="btn btn-error btn-outline"
                        >
                            Reset Keys
                        </button>
                    </div>
                </div>
            </section>

            <section className="text-center text-xs opacity-50 mt-10">
                <p>Haven Secure Messenger v1.0.0</p>
                <p>User ID: {session?.user.id}</p>
            </section>
        </div>
    );
}
