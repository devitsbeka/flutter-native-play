import { motion } from "framer-motion";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ShopCancel() {
  const navigate = useNavigate();

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-gradient-to-b from-background to-muted flex p-4"><div className="m-auto w-full flex justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        {/* Cancel Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
        >
          <XCircle className="w-12 h-12 text-white" strokeWidth={2} />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-bold text-foreground">
            გადახდა გაუქმებულია
          </h1>
          <p className="text-muted-foreground">
            თქვენი ტრანზაქცია არ დასრულებულა. თანხა არ ჩამოიჭრა.
          </p>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-card border shadow-sm text-left"
        >
          <h3 className="font-medium mb-2">რა მოხდა?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• გადახდა გაუქმდა თქვენი მოთხოვნით</li>
            <li>• თანხა არ ჩამოიჭრა თქვენი ანგარიშიდან</li>
            <li>• შეგიძლიათ ნებისმიერ დროს სცადოთ ხელახლა</li>
          </ul>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <Button
            onClick={() => navigate("/power-ups")}
            className="w-full"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            ხელახლა ცდა
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            მთავარ გვერდზე გადასვლა
          </Button>
        </motion.div>
      </motion.div>
      </div>
    </div>
  );
}
