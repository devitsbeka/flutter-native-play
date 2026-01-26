import React from 'react';
import { Loader2 } from 'lucide-react';
import retroTvIcon from '@/assets/retro-tv-colored.png';

export const ControllerRoundIntroWaiting: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
      <div className="max-w-xl mx-auto w-full">
      <div className="text-center max-w-md">
        <img
          src={retroTvIcon}
          alt="TV"
          className="w-20 h-20 object-contain mx-auto mb-4"
        />
        <h2 className="text-white text-xl font-bold mb-2">ველოდებით ჰოსტს</h2>
        <p className="text-purple-200 mb-6">შემდეგი რაუნდი მალე დაიწყება</p>
        <div className="flex items-center justify-center gap-2 text-purple-200">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>მოლოდინი...</span>
        </div>
        </div>
      </div>
    </div>
  );
};
