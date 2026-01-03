// Georgian Translation System - ქართული თარგმანი

export const ka = {
  // ==========================================
  // Common / ზოგადი
  // ==========================================
  common: {
    play: "თამაში",
    back: "უკან",
    next: "შემდეგი",
    skip: "გამოტოვება",
    done: "მზადაა",
    close: "დახურვა",
    save: "შენახვა",
    cancel: "გაუქმება",
    loading: "იტვირთება...",
    error: "შეცდომა",
    success: "წარმატება!",
    continue: "გაგრძელება",
    confirm: "დადასტურება",
    retry: "თავიდან ცადე",
    gotIt: "გასაგებია!",
    letsGo: "დავიწყოთ!",
    awesome: "შესანიშნავია!",
    nice: "კარგია!",
    oops: "უფს!",
    welcome: "კეთილი იყოს შენი მობრძანება!",
    hello: "გამარჯობა!",
    xp: "XP",
    level: "დონე",
    coins: "მონეტები",
    gems: "ალმასები",
  },

  // ==========================================
  // Authentication / ავთენტიფიკაცია
  // ==========================================
  auth: {
    createAccount: "ანგარიშის შექმნა",
    username: "მომხმარებელი",
    usernamePlaceholder: "შეიყვანე მომხმარებლის სახელი",
    password: "პაროლი",
    passwordPlaceholder: "შეიყვანე პაროლი",
    signIn: "შესვლა",
    signUp: "რეგისტრაცია",
    signOut: "გასვლა",
    alreadyHaveAccount: "უკვე გაქვს ანგარიში?",
    dontHaveAccount: "არ გაქვს ანგარიში?",
    usernameRequired: "მომხმარებლის სახელი სავალდებულოა",
    passwordRequired: "პაროლი სავალდებულოა",
    passwordTooShort: "პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს",
    usernameTooShort: "მომხმარებლის სახელი მინიმუმ 3 სიმბოლო უნდა იყოს",
    invalidCredentials: "არასწორი მონაცემები",
    accountCreated: "ანგარიში შეიქმნა!",
    welcomeBack: "კეთილი იყოს შენი დაბრუნება!",
  },

  // ==========================================
  // Onboarding / ონბორდინგი
  // ==========================================
  onboarding: {
    // Welcome step
    welcomeTitle: "გამარჯობა! 👋",
    welcomeSubtitle: "მზად ხარ გახდე ტრივიას ჩემპიონი?",
    startAdventure: "დავიწყოთ თავგადასავალი!",
    
    // Username step
    chooseUsername: "აირჩიე მომხმარებლის სახელი",
    usernameHint: "ეს სახელი ყველა მოთამაშეს დაანახებს",
    
    // Password step
    createPassword: "შექმენი პაროლი",
    passwordHint: "მინიმუმ 6 სიმბოლო",
    
    // Creating account step
    creatingAccount: "ანგარიში იქმნება...",
    almostThere: "თითქმის მზადაა!",
    settingUpProfile: "პროფილი მზადდება...",
    
    // Avatar step
    createAvatar: "შექმენი ავატარი",
    avatarSubtitle: "გადაიღე ან ატვირთე ფოტო შენი 3D ავატარის შესაქმნელად",
    takePhoto: "გადაიღე ფოტო",
    chooseFromLibrary: "ბიბლიოთეკიდან",
    recentPhotos: "ბოლო ფოტოები",
    
    // Camera step
    positionFace: "მოათავსე სახე ჩარჩოში",
    cameraHint: "თავისუფლად დადექი, სახე კარგად უნდა ჩანდეს",
    capture: "გადაღება",
    
    // Generating step
    generatingTitle: "ავატარი იქმნება",
    generatingStep1: "ფოტო იტვირთება...",
    generatingStep2: "3D მოდელი იქმნება...",
    generatingStep3: "ფონი იშლება...",
    generatingStep4: "თითქმის მზადაა!",
    magicHappening: "✨ მაგია ხდება...",
    
    // Preview step
    avatarReady: "შენი ავატარი მზადაა!",
    useThis: "გამოიყენე",
    regenerate: "თავიდან ცადე",
    
    // Walkthrough
    walkthroughTitle: "გაიცანი აპლიკაცია",
    walkthroughSkip: "გამოტოვება",
    walkthroughNext: "შემდეგი",
    walkthroughDone: "დავიწყოთ!",
    
    // Walkthrough steps
    step1Title: "შენი პროფილი",
    step1Description: "ეს შენი ავატარი და დონეა. თამაშე და მოაგროვე XP!",
    
    step2Title: "სუპერ ძალები",
    step2Description: "გამოიყენე სპეციალური ძალები კითხვებზე პასუხის გასაადვილებლად",
    
    step3Title: "თამაშის დაწყება",
    step3Description: "დააჭირე ამ ღილაკს თამაშის დასაწყებად!",
    
    step4Title: "აღმოჩენა",
    step4Description: "იპოვე ახალი კატეგორიები და თამაშები",
    
    step5Title: "რუკა",
    step5Description: "ნახე შენი პროგრესი და გახსენი ახალი დონეები",
    
    step6Title: "რანკი",
    step6Description: "შეადარე შენი შედეგი სხვა მოთამაშეებს",
  },

  // ==========================================
  // Power-ups / სუპერ ძალები
  // ==========================================
  powerups: {
    title: "სუპერ ძალები",
    subtitle: "გამოიყენე თამაშში",
    
    fiftyFifty: {
      name: "50/50",
      description: "ორი არასწორი პასუხი გაქრება და მხოლოდ ორი ვარიანტი დარჩება",
      hint: "საუკეთესოა როცა არ ხარ დარწმუნებული!",
    },
    freeze: {
      name: "გაყინვა",
      description: "დრო გაიყინება 10 წამით. მშვიდად დაფიქრდი კითხვაზე!",
      hint: "გამოიყენე როცა კითხვა რთულია და მეტი დრო გჭირდება!",
    },
    replace: {
      name: "შეცვლა",
      description: "არ მოგწონს კითხვა? შეცვალე ახლით!",
      hint: "თუ კითხვა ძალიან რთულია, სცადე ახალი",
    },
    timeDrain: {
      name: "დროის ქურდი",
      description: "მოიპარე 3 წამი მოწინააღმდეგის ტაიმერიდან",
      hint: "კარგია ბოლო წამებში!",
    },
    addPower: {
      name: "დამატება",
      description: "შეიძინე მეტი სუპერ ძალა მაღაზიიდან",
      hint: "ყოველდღე ახალი ბონუსებია!",
    },
  },

  // ==========================================
  // Navigation / ნავიგაცია
  // ==========================================
  nav: {
    explore: "აღმოაჩინე",
    map: "რუკა",
    play: "თამაში",
    rank: "რანკი",
    sound: "ხმა",
    profile: "პროფილი",
    settings: "პარამეტრები",
    home: "მთავარი",
    menu: "მენიუ",
  },

  // ==========================================
  // Sound Settings / ხმის პარამეტრები
  // ==========================================
  sound: {
    title: "ხმის პარამეტრები",
    music: "მუსიკა",
    soundEffects: "ხმოვანი ეფექტები",
    vibration: "ვიბრაცია",
    on: "ჩართული",
    off: "გამორთული",
  },

  // ==========================================
  // Game / თამაში
  // ==========================================
  game: {
    // XP Bar
    playToEarn: "ითამაშე და მოაგროვე XP! ✨",
    levelProgress: "დონე {level} ({current} XP) / {next} XP",
    
    // Categories
    classicTrivia: "კლასიკური ტრივია",
    funCasual: "გართობა",
    educational: "საგანმანათლებლო",
    
    // Game states
    searching: "ძებნა...",
    almostThere: "თითქმის მზადაა...",
    findingOpponent: "მოწინააღმდეგე იძებნება",
    matchFound: "მოწინააღმდეგე ნაპოვნია!",
    you: "შენ",
    getReady: "მოემზადე!",
    questionOf: "კითხვა {current}/{total}",
    timeUp: "დრო ამოიწურა!",
    correct: "სწორია! ✓",
    incorrect: "არასწორია ✗",
    
    // Results
    victory: "გამარჯვება!",
    defeat: "წააგე",
    draw: "ფრე",
    playAgain: "თავიდან ითამაშე",
    backToHome: "მთავარზე დაბრუნება",
    
    // Points
    pointsEarned: "+{points} ქულა",
    streakBonus: "სტრიკ ბონუსი!",
    perfectRound: "იდეალური რაუნდი!",
  },

  // ==========================================
  // Profile / პროფილი  
  // ==========================================
  profile: {
    myProfile: "ჩემი პროფილი",
    editProfile: "რედაქტირება",
    changeAvatar: "ავატარის შეცვლა",
    statistics: "სტატისტიკა",
    gamesPlayed: "ნათამაშები",
    gamesWon: "მოგებული",
    winRate: "მოგების %",
    currentStreak: "სტრიკი",
    bestStreak: "საუკეთესო სტრიკი",
    totalPoints: "ქულები",
  },

  // ==========================================
  // Leaderboard / რანკი
  // ==========================================
  leaderboard: {
    title: "ლიდერბორდი",
    global: "გლობალური",
    friends: "მეგობრები",
    weekly: "კვირის",
    allTime: "ყველა დროის",
    yourRank: "შენი პოზიცია",
    noRankYet: "ჯერ არ გაქვს რანკი",
    playToRank: "ითამაშე რანკის მისაღებად!",
  },

  // ==========================================
  // Avatar / ავატარი
  // ==========================================
  avatar: {
    title: "შენი ავატარი",
    subtitle: "შექმენი ან აირჩიე თამაშის ავატარი",
    aiTitle: "AI ავატარი",
    currentAvatar: "მიმდინარე ავატარი",
    previousAvatars: "წინა ავატარები",
    createNew: "ახალი ავატარის შექმნა",
    takeSelfie: "სელფი",
    uploadPhoto: "ატვირთვა",
    reAnimate: "ხელახლა ანიმაცია",
    animateAvatar: "ანიმაცია",
    animating: "მიმდინარეობს...",
    description: "გადაიღე სელფი ან ატვირთე ფოტო შენი 3D ავატარის შესაქმნელად",
    positionFace: "მოათავსე სახე ჩარჩოში",
    generating: "ავატარი იქმნება...",
    generatingTime: "შესაძლოა 30-60 წამი დასჭირდეს",
    avatarReady: "შენი 3D ავატარი მზადაა!",
    change: "შეცვლა",
    generate: "გენერირება",
    regenerate: "თავიდან",
    useAsProfile: "გამოყენება",
    capture: "გადაღება",
    avatarSaved: "ავატარი შენახულია! 🎉",
    avatarUpdated: "ავატარი განახლდა!",
    avatarAnimated: "ავატარი ანიმირებულია! 🎬",
    animationStarted: "ანიმაცია დაიწყო! მიმდინარეობს შემოწმება...",
    stillProcessing: "ჯერ კიდევ მუშავდება... ({time} წთ)",
    animationTakingLong: "ანიმაციას მოსალოდნელზე მეტი დრო სჭირდება. გთხოვთ სცადოთ მოგვიანებით.",
    startingAnimation: "ანიმაცია იწყება... 1-2 წუთი დასჭირდება!",
  },

  // ==========================================
  // Errors / შეცდომები
  // ==========================================
  errors: {
    generic: "რაღაც შეცდომა მოხდა",
    network: "ინტერნეტთან კავშირი არ არის",
    tryAgain: "სცადე თავიდან",
    cameraAccess: "კამერაზე წვდომა უარყოფილია",
    cameraPermission: "კამერის წვდომა შეუძლებელია. გთხოვთ შეამოწმოთ ნებართვები.",
    uploadFailed: "ატვირთვა ვერ მოხერხდა",
    generationFailed: "ავატარის გენერაცია ვერ მოხერხდა",
    imageTooLarge: "სურათი 5MB-ზე ნაკლები უნდა იყოს",
    selectImageFile: "გთხოვთ აირჩიოთ სურათის ფაილი",
    noAvatarToAnimate: "ანიმაციისთვის ავატარი არ არის",
  },

  // ==========================================
  // Success Messages / წარმატების შეტყობინებები
  // ==========================================
  success: {
    avatarSaved: "ავატარი შენახულია!",
    profileUpdated: "პროფილი განახლდა!",
    accountCreated: "ანგარიში შეიქმნა!",
  },

  // ==========================================
  // Daily Rewards / ყოველდღიური ჯილდოები
  // ==========================================
  dailyRewards: {
    title: "ყოველდღიური ჯილდოები",
    subtitle: "შედი ყოველდღე და მიიღე ჯილდოები!",
    day: "დღე {day}",
    today: "დღეს",
    claimed: "მიღებული",
    claim: "მიიღე",
    claimNow: "მიიღე ახლა!",
    streak: "სტრიკი",
    daysInRow: "{days} დღე ზედიზედ",
    comeBackTomorrow: "ხვალ დაბრუნდი მეტი ჯილდოებისთვის!",
    streakBonus: "სტრიკ ბონუსი!",
    coins: "მონეტა",
    gems: "ალმასი",
    xp: "XP",
    powerUp: "სუპერ ძალა",
    keepItUp: "ასე გააგრძელე!",
    amazing: "საოცარია!",
    congratulations: "გილოცავ!",
  },
};

// Type for translation keys
export type TranslationKey = keyof typeof ka;

// Helper function to get nested translation
export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split(".");
  let value: any = ka;
  
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  
  if (typeof value !== "string") {
    console.warn(`Translation value is not a string: ${key}`);
    return key;
  }
  
  // Replace params like {name} with actual values
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return params[paramKey]?.toString() ?? `{${paramKey}}`;
    });
  }
  
  return value;
}

export default ka;
