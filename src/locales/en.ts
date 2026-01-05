// English Translation System

import type { KaTranslations } from './ka';

export const en: KaTranslations = {
  // ==========================================
  // Common
  // ==========================================
  common: {
    play: "Play",
    back: "Back",
    next: "Next",
    skip: "Skip",
    done: "Done",
    close: "Close",
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",
    error: "Error",
    success: "Success!",
    continue: "Continue",
    confirm: "Confirm",
    retry: "Try Again",
    gotIt: "Got it!",
    letsGo: "Let's Go!",
    awesome: "Awesome!",
    nice: "Nice!",
    oops: "Oops!",
    welcome: "Welcome!",
    hello: "Hello!",
    xp: "XP",
    level: "Level",
    coins: "Coins",
    gems: "Gems",
    noQuestionsTitle: "No Questions Yet",
    noQuestionsMessage: "Questions in this language will be added soon!",
  },

  // ==========================================
  // Authentication
  // ==========================================
  auth: {
    createAccount: "Create Account",
    username: "Username",
    usernamePlaceholder: "Enter your username",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    signIn: "Sign In",
    signUp: "Sign Up",
    signOut: "Sign Out",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    usernameRequired: "Username is required",
    passwordRequired: "Password is required",
    passwordTooShort: "Password must be at least 6 characters",
    usernameTooShort: "Username must be at least 3 characters",
    invalidCredentials: "Invalid credentials",
    accountCreated: "Account created!",
    welcomeBack: "Welcome back!",
  },

  // ==========================================
  // Onboarding
  // ==========================================
  onboarding: {
    welcomeTitle: "Hello! 👋",
    welcomeSubtitle: "Ready to become a trivia champion?",
    startAdventure: "Start Adventure!",
    chooseUsername: "Choose a Username",
    usernameHint: "This name will be visible to all players",
    createPassword: "Create Password",
    passwordHint: "At least 6 characters",
    creatingAccount: "Creating account...",
    almostThere: "Almost there!",
    settingUpProfile: "Setting up profile...",
    createAvatar: "Create Avatar",
    avatarSubtitle: "Take or upload a photo to create your 3D avatar",
    takePhoto: "Take Photo",
    chooseFromLibrary: "From Library",
    recentPhotos: "Recent Photos",
    positionFace: "Position your face in the frame",
    cameraHint: "Stand naturally, face should be clearly visible",
    capture: "Capture",
    generatingTitle: "Creating Avatar",
    generatingStep1: "Uploading photo...",
    generatingStep2: "Creating 3D model...",
    generatingStep3: "Removing background...",
    generatingStep4: "Almost done!",
    magicHappening: "✨ Magic happening...",
    avatarReady: "Your avatar is ready!",
    useThis: "Use This",
    regenerate: "Try Again",
    walkthroughTitle: "Explore the App",
    walkthroughSkip: "Skip",
    walkthroughNext: "Next",
    walkthroughDone: "Let's Go!",
    step1Title: "Your Profile",
    step1Description: "This is your avatar and level. Play and earn XP!",
    step2Title: "Power-ups",
    step2Description: "Use special powers to help answer questions",
    step3Title: "Start Game",
    step3Description: "Tap this button to start playing!",
    step4Title: "Discover",
    step4Description: "Find new categories and games",
    step5Title: "Map",
    step5Description: "See your progress and unlock new levels",
    step6Title: "Rank",
    step6Description: "Compare your score with other players",
  },

  // ==========================================
  // Power-ups
  // ==========================================
  powerups: {
    title: "Power-ups",
    subtitle: "Use in game",
    fiftyFifty: {
      name: "50/50",
      description: "Two wrong answers disappear, leaving only two options",
      hint: "Best when you're not sure!",
    },
    freeze: {
      name: "Freeze",
      description: "Time freezes for 10 seconds. Think calmly about the question!",
      hint: "Use when the question is hard and you need more time!",
    },
    replace: {
      name: "Replace",
      description: "Don't like the question? Replace it with a new one!",
      hint: "If the question is too hard, try a new one",
    },
    timeDrain: {
      name: "Time Drain",
      description: "Steal 3 seconds from your opponent's timer",
      hint: "Great in the final seconds!",
    },
    addPower: {
      name: "Add More",
      description: "Get more power-ups from the shop",
      hint: "New bonuses every day!",
    },
  },

  // ==========================================
  // Navigation
  // ==========================================
  nav: {
    explore: "Explore",
    map: "Map",
    play: "Play",
    rank: "Rank",
    sound: "Sound",
    profile: "Profile",
    settings: "Settings",
    home: "Home",
    menu: "Menu",
  },

  // ==========================================
  // Menu
  // ==========================================
  menu: {
    rewards: "Rewards",
    missions: "Missions",
    treasure: "Treasure Chest",
    shop: "Shop",
    party: "Party",
    otherGames: "Other Games",
    settings: "Settings",
    help: "Help",
    privacy: "Privacy",
    signOut: "Sign Out",
    signIn: "Sign In",
    comingSoon: "Coming soon!",
    player: "Player",
    points: "points",
  },

  // ==========================================
  // Sound Settings
  // ==========================================
  sound: {
    title: "Sound Settings",
    music: "Music",
    soundEffects: "Sound Effects",
    vibration: "Vibration",
    on: "On",
    off: "Off",
  },

  // ==========================================
  // Game
  // ==========================================
  game: {
    playToEarn: "Play and earn XP! ✨",
    levelProgress: "Level {level} ({current} XP) / {next} XP",
    classicTrivia: "Classic Trivia",
    funCasual: "Fun & Casual",
    educational: "Educational",
    searching: "Searching...",
    almostThere: "Almost there...",
    findingOpponent: "Finding opponent",
    matchFound: "Match found!",
    you: "You",
    getReady: "Get Ready!",
    questionOf: "Question {current}/{total}",
    timeUp: "Time's up!",
    correct: "Correct! ✓",
    incorrect: "Incorrect ✗",
    victory: "Victory!",
    defeat: "Defeat",
    draw: "Draw",
    playAgain: "Play Again",
    backToHome: "Back to Home",
    pointsEarned: "+{points} points",
    streakBonus: "Streak Bonus!",
    perfectRound: "Perfect Round!",
  },

  // ==========================================
  // Profile
  // ==========================================
  profile: {
    myProfile: "My Profile",
    editProfile: "Edit Profile",
    changeAvatar: "Change Avatar",
    statistics: "Statistics",
    gamesPlayed: "Games Played",
    gamesWon: "Games Won",
    winRate: "Win Rate",
    currentStreak: "Streak",
    bestStreak: "Best Streak",
    totalPoints: "Total Points",
  },

  // ==========================================
  // Leaderboard
  // ==========================================
  leaderboard: {
    title: "Leaderboard",
    global: "Global",
    friends: "Friends",
    weekly: "Weekly",
    allTime: "All Time",
    yourRank: "Your Position",
    noRankYet: "No rank yet",
    playToRank: "Play to get ranked!",
    noPlayersYet: "No one is in this league yet",
    daysLeft: "{days} days left",
    regionLeaderboard: "{region} Leaderboard",
    globalLeaderboard: "Global Leaderboard",
  },

  // ==========================================
  // Settings
  // ==========================================
  settings: {
    title: "Settings",
    editName: "Edit Name",
    changePassword: "Change Password",
    language: "Language",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    passwordMismatch: "Passwords don't match",
    passwordChanged: "Password changed!",
    nameChanged: "Name changed!",
  },

  // ==========================================
  // Avatar
  // ==========================================
  avatar: {
    title: "Your Avatar",
    subtitle: "Create or choose a game avatar",
    aiTitle: "AI Avatar",
    currentAvatar: "Current Avatar",
    previousAvatars: "Previous Avatars",
    myAvatars: "My Avatars",
    defaultAvatars: "Default Avatars",
    createNew: "Create New Avatar",
    takeSelfie: "Selfie",
    uploadPhoto: "Upload",
    reAnimate: "Re-animate",
    animateAvatar: "Animate",
    animating: "Processing...",
    description: "Take a selfie or upload a photo to create your 3D avatar",
    positionFace: "Position your face in the frame",
    generating: "Creating avatar...",
    generatingTime: "May take 30-60 seconds",
    avatarReady: "Your 3D avatar is ready!",
    change: "Change",
    generate: "Generate",
    regenerate: "Regenerate",
    useAsProfile: "Use as Profile",
    capture: "Capture",
    avatarSaved: "Avatar saved! 🎉",
    avatarUpdated: "Avatar updated!",
    avatarAnimated: "Avatar animated! 🎬",
    animationStarted: "Animation started! Checking status...",
    stillProcessing: "Still processing... ({time} min)",
    animationTakingLong: "Animation is taking longer than expected. Please try again later.",
    startingAnimation: "Starting animation... Will take 1-2 minutes!",
  },

  // ==========================================
  // Errors
  // ==========================================
  errors: {
    generic: "Something went wrong",
    network: "No internet connection",
    tryAgain: "Try again",
    cameraAccess: "Camera access denied",
    cameraPermission: "Cannot access camera. Please check permissions.",
    uploadFailed: "Upload failed",
    generationFailed: "Avatar generation failed",
    imageTooLarge: "Image must be less than 5MB",
    selectImageFile: "Please select an image file",
    noAvatarToAnimate: "No avatar to animate",
  },

  // ==========================================
  // Success Messages
  // ==========================================
  success: {
    avatarSaved: "Avatar saved!",
    profileUpdated: "Profile updated!",
    accountCreated: "Account created!",
  },

  // ==========================================
  // Daily Rewards
  // ==========================================
  dailyRewards: {
    title: "Daily Rewards",
    subtitle: "Log in every day to get rewards!",
    day: "Day {day}",
    today: "Today",
    claimed: "Claimed",
    claim: "Claim",
    claimNow: "Claim Now!",
    streak: "Streak",
    daysInRow: "{days} days in a row",
    comeBackTomorrow: "Come back tomorrow for more rewards!",
    streakBonus: "Streak Bonus!",
    coins: "Coin",
    gems: "Gem",
    xp: "XP",
    powerUp: "Power-up",
    keepItUp: "Keep it up!",
    amazing: "Amazing!",
    congratulations: "Congratulations!",
  },

  // ==========================================
  // Countries (for leaderboard regions)
  // ==========================================
  countries: {
    ge: "Georgia",
    global: "Global",
    us: "United States",
    uk: "United Kingdom",
    ru: "Russia",
    de: "Germany",
    fr: "France",
    es: "Spain",
    it: "Italy",
    tr: "Turkey",
  },
};

export default en;
