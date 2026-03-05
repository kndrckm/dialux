import { motion } from 'motion/react';
import { Loader2, FileSearch, Cpu } from 'lucide-react';

export type ProcessingStep = 'idle' | 'reading-pdf' | 'analyzing' | 'done' | 'error';

interface ProgressIndicatorProps {
    step: ProcessingStep;
}

export default function ProgressIndicator({ step }: ProgressIndicatorProps) {
    const steps = [
        {
            key: 'reading-pdf' as const,
            label: 'Reading PDF',
            desc: 'Extracting text content from the document',
            icon: FileSearch
        },
        {
            key: 'analyzing' as const,
            label: 'Analyzing with AI',
            desc: 'Gemini is structuring the technical parameters',
            icon: Cpu
        },
    ];

    const currentStepIndex = steps.findIndex(s => s.key === step);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col items-center justify-center gap-8 p-8"
        >
            <Loader2 className="animate-spin w-12 h-12 stroke-[1px]" />

            <div className="w-full max-w-xs space-y-4">
                {steps.map((s, i) => {
                    const isActive = s.key === step;
                    const isDone = currentStepIndex > i;

                    return (
                        <div
                            key={s.key}
                            className={`flex items-center gap-4 transition-all ${isActive ? 'opacity-100' : isDone ? 'opacity-40' : 'opacity-20'
                                }`}
                        >
                            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all
                ${isActive ? 'bg-[#141414] text-[#E4E3E0]' : isDone ? 'bg-[#141414]/20 text-[#141414]' : 'border border-[#141414]/20'}
              `}>
                                {isActive ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : isDone ? (
                                    <s.icon size={14} />
                                ) : (
                                    <span className="text-[10px] font-mono">{i + 1}</span>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    {isDone ? '✓ ' : ''}{s.label}
                                </p>
                                {isActive && (
                                    <motion.p
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="text-[10px] font-mono opacity-50 uppercase tracking-widest mt-0.5"
                                    >
                                        {s.desc}
                                    </motion.p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-[10px] font-mono uppercase tracking-widest opacity-30">
                Step {Math.max(1, currentStepIndex + 1)} of {steps.length}
            </p>
        </motion.div>
    );
}
