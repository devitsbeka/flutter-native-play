import React from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface QRCodeDisplayProps {
  url: string;
  size?: number;
  title?: string;
  subtitle?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  url,
  size = 200,
  title: titleProp,
  subtitle: subtitleProp,
}) => {
  const { t } = useLanguage();
  const title = titleProp ?? t("extra.tvJoinTheGame");
  const subtitle = subtitleProp ?? t("extra.tvScanQRCode");
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border-2 border-border rounded-3xl p-6 text-center"
    >
      {title && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <QrCode className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>
      )}
      
      {subtitle && (
        <p className="text-muted-foreground text-sm mb-4">{subtitle}</p>
      )}

      <div className="bg-white p-4 rounded-xl inline-block">
        <QRCodeSVG 
          value={url} 
          size={size}
          level="H"
          includeMargin
        />
      </div>

      <p className="text-muted-foreground text-xs mt-4 break-all max-w-[280px] mx-auto">
        {url}
      </p>
    </motion.div>
  );
};
