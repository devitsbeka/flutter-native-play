import { motion, AnimatePresence } from "framer-motion";
import { X, Check, UserPlus, Wifi } from "lucide-react";
import { JoinRequest } from "@/hooks/useNearbyConnections";

interface NearbyJoinRequestModalProps {
  request: JoinRequest | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function NearbyJoinRequestModal({ 
  request, 
  onAccept, 
  onDecline 
}: NearbyJoinRequestModalProps) {
  if (!request) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header with pulse animation */}
          <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-center">
            {/* Animated rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="absolute w-24 h-24 rounded-full border-2 border-white/30"
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.div
                className="absolute w-24 h-24 rounded-full border-2 border-white/30"
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              />
            </div>
            
            {/* Icon */}
            <motion.div
              className="relative w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Wifi className="w-8 h-8 text-white" />
            </motion.div>
            
            <h2 className="text-xl font-bold text-white mb-1">
              ახალი მოთხოვნა!
            </h2>
            <p className="text-white/80 text-sm">
              ვინმე გსურს შემოგიერთდეთ
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Player info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-foreground text-lg">
                  {request.peerId}
                </div>
                <div className="text-sm text-muted-foreground">
                  სურს თქვენს თამაშში შემოსვლა
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <motion.button
                onClick={onDecline}
                className="flex-1 py-4 px-6 rounded-2xl font-bold text-red-600 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(180deg, #FEE2E2 0%, #FECACA 100%)",
                  boxShadow: "0 4px 0 #F87171",
                }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98, y: 2, boxShadow: "0 2px 0 #F87171" }}
              >
                <X className="w-5 h-5" />
                უარყოფა
              </motion.button>

              <motion.button
                onClick={onAccept}
                className="flex-1 py-4 px-6 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
                  boxShadow: "0 4px 0 #059669",
                }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98, y: 2, boxShadow: "0 2px 0 #059669" }}
              >
                <Check className="w-5 h-5" />
                მიღება
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
