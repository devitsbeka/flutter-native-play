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
    noQuestionsTitle: "კითხვები ჯერ არ არის",
    noQuestionsMessage: "ამ ენაზე კითხვები მალე დაემატება!",
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
    welcomeTitle: "გამარჯობა! 👋",
    welcomeSubtitle: "მზად ხარ გახდე ტრივიას ჩემპიონი?",
    startAdventure: "დავიწყოთ თავგადასავალი!",
    chooseUsername: "აირჩიე მომხმარებლის სახელი",
    usernameHint: "ეს სახელი ყველა მოთამაშეს დაანახებს",
    createPassword: "შექმენი პაროლი",
    passwordHint: "მინიმუმ 6 სიმბოლო",
    creatingAccount: "ანგარიში იქმნება...",
    almostThere: "თითქმის მზადაა!",
    settingUpProfile: "პროფილი მზადდება...",
    createAvatar: "შექმენი ავატარი",
    avatarSubtitle: "გადაიღე ან ატვირთე ფოტო შენი 3D ავატარის შესაქმნელად",
    takePhoto: "გადაიღე ფოტო",
    chooseFromLibrary: "ბიბლიოთეკიდან",
    recentPhotos: "ბოლო ფოტოები",
    positionFace: "მოათავსე სახე ჩარჩოში",
    cameraHint: "თავისუფლად დადექი, სახე კარგად უნდა ჩანდეს",
    capture: "გადაღება",
    generatingTitle: "ავატარი იქმნება",
    generatingStep1: "ფოტო იტვირთება...",
    generatingStep2: "3D მოდელი იქმნება...",
    generatingStep3: "ფონი იშლება...",
    generatingStep4: "თითქმის მზადაა!",
    magicHappening: "✨ მაგია ხდება...",
    avatarReady: "შენი ავატარი მზადაა!",
    useThis: "გამოიყენე",
    regenerate: "თავიდან ცადე",
    walkthroughTitle: "გაიცანი აპლიკაცია",
    walkthroughSkip: "გამოტოვება",
    walkthroughNext: "შემდეგი",
    walkthroughDone: "დავიწყოთ!",
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
  // Menu / მენიუ
  // ==========================================
  menu: {
    rewards: "ჯილდოები",
    missions: "მისიები",
    treasure: "განძის ყუთი",
    shop: "მაღაზია",
    party: "Party",
    otherGames: "სხვა თამაშები",
    settings: "პარამეტრები",
    help: "დახმარება",
    privacy: "კონფიდენციალურობა",
    signOut: "გამოსვლა",
    signIn: "შესვლა",
    comingSoon: "მალე დაემატება!",
    player: "მოთამაშე",
    points: "ქულა",
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
    playToEarn: "ითამაშე და მოაგროვე XP! ✨",
    levelProgress: "დონე {level} ({current} XP) / {next} XP",
    classicTrivia: "კლასიკური ტრივია",
    funCasual: "გართობა",
    educational: "საგანმანათლებლო",
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
    victory: "გამარჯვება!",
    defeat: "წააგე",
    draw: "ფრე",
    playAgain: "თავიდან ითამაშე",
    backToHome: "მთავარზე დაბრუნება",
    pointsEarned: "+{points} ქულა",
    streakBonus: "სტრიკ ბონუსი!",
    perfectRound: "იდეალური რაუნდი!",
    newRound: "ახალი რაუნდი",
    starting: "იწყება...",
    backToRoom: "ოთახში დაბრუნება",
    place: "მე-{rank} ადგილი",
    placeFirst: "მე-{rank} ადგილი!",
    couldNotStartRound: "ახალი რაუნდის დაწყება ვერ მოხერხდა",
    quizzes: "{count} ვიქტორინა",
    gameLoading: "თამაში იტვირთება...",
    answered: "უპასუხა",
    nextQuestion: "შემდეგი კითხვა",
    viewResults: "შედეგების ნახვა",
    youWin: "🎉 გაიმარჯვე!",
    youLose: "😢 წააგე",
    itsTie: "🤝 ფრე!",
    opponent: "მოწინააღმდეგე",
    difficulty: {
      easy: "მარტივი",
      medium: "საშუალო",
      hard: "რთული",
    },
    labelA: "ა",
    labelB: "ბ",
    labelC: "გ",
    labelD: "დ",
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
    noPlayersYet: "ჯერ არავინ არ არის ამ ლიგაში",
    daysLeft: "{days} დღე დარჩა",
    regionLeaderboard: "{region} ლიდერბორდი",
    globalLeaderboard: "გლობალური ლიდერბორდი",
  },

  // ==========================================
  // Settings / პარამეტრები
  // ==========================================
  settings: {
    title: "პარამეტრები",
    editName: "სახელის შეცვლა",
    changePassword: "პაროლის შეცვლა",
    language: "ენა",
    currentPassword: "მიმდინარე პაროლი",
    newPassword: "ახალი პაროლი",
    confirmPassword: "გაიმეორე პაროლი",
    passwordMismatch: "პაროლები არ ემთხვევა",
    passwordChanged: "პაროლი შეიცვალა!",
    nameChanged: "სახელი შეიცვალა!",
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
    myAvatars: "ჩემი ავატარები",
    defaultAvatars: "ნაგულისხმევი ავატარები",
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

  // ==========================================
  // Countries / ქვეყნები (for leaderboard regions)
  // ==========================================
  countries: {
    ge: "საქართველო",
    global: "გლობალური",
    us: "აშშ",
    uk: "გაერთიანებული სამეფო",
    ru: "რუსეთი",
    de: "გერმანია",
    fr: "საფრანგეთი",
    es: "ესპანეთი",
    it: "იტალია",
    tr: "თურქეთი",
  },
};

export type KaTranslations = typeof ka;
export default ka;
