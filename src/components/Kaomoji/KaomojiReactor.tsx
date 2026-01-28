import { motion, AnimatePresence } from "framer-motion";
import { useDownloadStore } from "@/stores/downloadStore";

type KaomojiSet = {
    face: string;
    message: string;
};

const KAOMOJI_MAP: Record<string, KaomojiSet> = {
    idle: { face: "(・ω・)", message: "Ready to download~" },
    validating: { face: "(◕‿◕)", message: "Checking URL..." },
    downloading: { face: "٩(◕‿◕)۶", message: "Downloading!" },
    converting: { face: "(ﾉ◕ヮ◕)ﾉ✧", message: "Converting audio~" },
    success: { face: "✧(≧▽≦)✧", message: "Done!" },
    error: { face: "(´;ω;\`)", message: "Something went wrong..." },
};

export const KaomojiReactor = () => {
    const status = useDownloadStore((state) => state.status);

    const kaomoji = KAOMOJI_MAP[status] ?? KAOMOJI_MAP.idle!;
    const { face, message } = kaomoji;

    return (
        <div className="text-center py-6">
            <AnimatePresence mode="wait">
                <motion.div
                    key={status}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="space-y-2"
                >
                    {/* Kaomoji Face */}
                    <motion.div
                        className="text-4xl select-none"
                        style={{ color: "var(--color-accent)" }}
                        animate={status === "downloading" ? { y: [0, -4, 0] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                        {face}
                    </motion.div>

                    {/* Status Message */}
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        {message}
                    </p>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
