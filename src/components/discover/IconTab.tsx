interface IconTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function IconTab({ label, isActive, onClick }: IconTabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full transition-all whitespace-nowrap ${
        isActive 
          ? "bg-white/80 text-slate-800 font-semibold shadow-sm" 
          : "text-white/80 hover:text-white font-medium"
      }`}
    >
      {label}
    </button>
  );
}
