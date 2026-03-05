import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, ArrowRight, Settings } from 'lucide-react';

interface ApiKeyInputProps {
    onSubmit: (key: string) => void;
}

export default function ApiKeyInput({ onSubmit }: ApiKeyInputProps) {
    const [key, setKey] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = key.trim();
        if (!trimmed) {
            setError('Please enter your API key');
            return;
        }
        if (trimmed.length < 10) {
            setError('That doesn\'t look like a valid API key');
            return;
        }
        onSubmit(trimmed);
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="bg-white border border-[#141414] rounded-sm p-8 shadow-sm">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-[#141414] flex items-center justify-center rounded-sm">
                            <KeyRound className="text-[#E4E3E0] w-8 h-8" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-serif italic mb-2">API Key Required</h1>
                        <p className="text-xs font-mono uppercase tracking-widest opacity-50">
                            Enter your Gemini API key to continue
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-mono uppercase tracking-widest opacity-50 mb-2">
                                Gemini API Key
                            </label>
                            <input
                                type="password"
                                value={key}
                                onChange={(e) => { setKey(e.target.value); setError(''); }}
                                placeholder="AIza..."
                                className="w-full border border-[#141414]/20 rounded-sm px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#141414] transition-colors bg-[#E4E3E0]/20"
                            />
                            {error && (
                                <p className="text-red-500 text-xs mt-1 font-mono">{error}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-[#141414] text-[#E4E3E0] py-3 rounded-sm text-xs font-mono uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                        >
                            Continue
                            <ArrowRight size={14} />
                        </button>
                    </form>

                    {/* Help Text */}
                    <div className="mt-6 pt-6 border-t border-[#141414]/10">
                        <div className="flex items-start gap-3">
                            <Settings size={14} className="opacity-30 mt-0.5 shrink-0" />
                            <p className="text-[10px] font-mono opacity-40 leading-relaxed">
                                Your key is stored locally in your browser and never sent to any server other than Google's Gemini API.
                                Get your key at{' '}
                                <a
                                    href="https://aistudio.google.com/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:opacity-100 transition-opacity"
                                >
                                    aistudio.google.com
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
