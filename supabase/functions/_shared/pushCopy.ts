/**
 * Every scheduled and social push the app sends: copy, icon and landing
 * route, per kind, in all seven app languages.
 *
 * Rules this file enforces by construction:
 *  - No emojis in titles or bodies. The notification's image is an icon from
 *    the app's own library, served from mytrivia.io/push/ — the text stays
 *    text. (src/__tests__/pushCopy.test.ts pins this.)
 *  - Every kind exists in every language, so a recipient's
 *    profiles.preferred_language always resolves without a mixed-language
 *    notification. 'en' is the fallback for accounts that never chose.
 *  - `{param}` placeholders are filled with fill(); a kind's params are the
 *    same in every language.
 *
 * Dependency-free on purpose: imported by the Deno edge functions AND by a
 * vitest in src/__tests__, which keeps the seven languages from drifting.
 */

export interface PushMessage {
  title: string;
  body: string;
}

export type PushKind =
  | "streak_saver"
  | "daily_chest"
  | "mission_progress"
  | "mission_reward"
  | "lives_full"
  | "tv_weekend"
  | "league_results"
  | "league_lastchance"
  | "winback_3"
  | "winback_7"
  | "winback_30"
  | "creator_digest"
  | "friend_request"
  | "friend_accept"
  | "challenge_beaten"
  | "room_ping"
  | "team_poke";

export const PUSH_LANGUAGES = ["ka", "en", "de", "es", "fr", "it", "pt"] as const;

const SITE = "https://mytrivia.io";

/** Icon image and default landing route per kind. */
export const PUSH_META: Record<PushKind, { icon: string; route: string }> = {
  streak_saver: { icon: `${SITE}/push/flame.png`, route: "/?missions=1" },
  daily_chest: { icon: `${SITE}/push/treasure-chest.png`, route: "/?daily=1" },
  mission_progress: { icon: `${SITE}/push/star.png`, route: "/?missions=1" },
  mission_reward: { icon: `${SITE}/push/gift.png`, route: "/?missions=1" },
  lives_full: { icon: `${SITE}/push/lightning.png`, route: "/" },
  tv_weekend: { icon: `${SITE}/push/tv.png`, route: "/team?open=tv" },
  league_results: { icon: `${SITE}/push/trophy.png`, route: "/leaderboards" },
  league_lastchance: { icon: `${SITE}/push/crown.png`, route: "/leaderboards" },
  winback_3: { icon: `${SITE}/push/bell.png`, route: "/" },
  winback_7: { icon: `${SITE}/push/joystick.png`, route: "/team?open=trivia" },
  winback_30: { icon: `${SITE}/push/crown.png`, route: "/" },
  creator_digest: { icon: `${SITE}/push/star.png`, route: "/discover" },
  friend_request: { icon: `${SITE}/push/handshake.png`, route: "/notifications" },
  friend_accept: { icon: `${SITE}/push/handshake.png`, route: "/notifications" },
  // route is built by the caller: /challenge/{code}
  challenge_beaten: { icon: `${SITE}/push/sword.png`, route: "/" },
  // route is built by the caller: /team?join={room_code}
  room_ping: { icon: `${SITE}/push/bell.png`, route: "/team" },
  // route is built by the caller: /team-battle?code={room_code}
  team_poke: { icon: `${SITE}/push/bell.png`, route: "/team-battle" },
};

export const PUSH_COPY: Record<PushKind, Record<string, PushMessage>> = {
  streak_saver: {
    ka: { title: "არ დაკარგო {days}-დღიანი სერია", body: "ერთი თამაში დღეს — და სერია გაგრძელდება." },
    en: { title: "Don't lose your {days}-day streak", body: "One game today keeps your streak alive." },
    de: { title: "Verlier deine {days}-Tage-Serie nicht", body: "Ein Spiel heute hält deine Serie am Leben." },
    es: { title: "No pierdas tu racha de {days} días", body: "Una partida hoy mantiene viva tu racha." },
    fr: { title: "Ne perds pas ta série de {days} jours", body: "Une partie aujourd'hui garde ta série en vie." },
    it: { title: "Non perdere la tua serie di {days} giorni", body: "Una partita oggi tiene viva la tua serie." },
    pt: { title: "Não perca sua sequência de {days} dias", body: "Um jogo hoje mantém sua sequência viva." },
  },
  daily_chest: {
    ka: { title: "შენი დღიური ზარდახშა გელოდება", body: "გახსენი, სანამ დღე დასრულდება." },
    en: { title: "Your daily chest is waiting", body: "Open it before the day ends." },
    de: { title: "Deine tägliche Truhe wartet", body: "Öffne sie, bevor der Tag endet." },
    es: { title: "Tu cofre diario te espera", body: "Ábrelo antes de que termine el día." },
    fr: { title: "Ton coffre du jour t'attend", body: "Ouvre-le avant la fin de la journée." },
    it: { title: "Il tuo forziere del giorno ti aspetta", body: "Aprilo prima che finisca la giornata." },
    pt: { title: "Seu baú diário está esperando", body: "Abra antes que o dia acabe." },
  },
  mission_progress: {
    ka: { title: "ცოტაც დარჩა", body: "დღეს 1 მისია დაგრჩა შესასრულებელი." },
    en: { title: "Almost there", body: "1 mission left to complete today." },
    de: { title: "Fast geschafft", body: "Heute fehlt dir noch 1 Mission." },
    es: { title: "Ya casi", body: "Te queda 1 misión por completar hoy." },
    fr: { title: "Presque fini", body: "Il te reste 1 mission à terminer aujourd'hui." },
    it: { title: "Ci sei quasi", body: "Ti resta 1 missione da completare oggi." },
    pt: { title: "Quase lá", body: "Falta 1 missão para completar hoje." },
  },
  mission_reward: {
    ka: { title: "ჯილდო გაქვს მიღებული", body: "წაიღე ის, რაც უკვე მოიგე." },
    en: { title: "You earned a reward", body: "Claim what you've already won." },
    de: { title: "Du hast eine Belohnung verdient", body: "Hol dir, was du schon gewonnen hast." },
    es: { title: "Ganaste una recompensa", body: "Reclama lo que ya has ganado." },
    fr: { title: "Tu as gagné une récompense", body: "Récupère ce que tu as déjà gagné." },
    it: { title: "Hai guadagnato un premio", body: "Ritira quello che hai già vinto." },
    pt: { title: "Você ganhou uma recompensa", body: "Resgate o que você já conquistou." },
  },
  lives_full: {
    ka: { title: "თამაშები აღდგა", body: "5 ახალი თამაში მზადაა — შემოდი." },
    en: { title: "Your plays are back", body: "5 fresh games are ready — jump in." },
    de: { title: "Deine Spiele sind wieder da", body: "5 neue Spiele warten — leg los." },
    es: { title: "Tus partidas han vuelto", body: "5 partidas nuevas te esperan — entra." },
    fr: { title: "Tes parties sont de retour", body: "5 nouvelles parties t'attendent — lance-toi." },
    it: { title: "Le tue partite sono tornate", body: "5 nuove partite ti aspettano — entra." },
    pt: { title: "Suas partidas voltaram", body: "5 jogos novos estão prontos — entre." },
  },
  tv_weekend: {
    ka: { title: "ტრივია დიდ ეკრანზე", body: "ითამაშე მეგობრებთან და ოჯახთან ერთად TV-ზე." },
    en: { title: "Trivia on the big screen", body: "Play with your friends and family on TV." },
    de: { title: "Trivia auf dem großen Bildschirm", body: "Spiel mit Freunden und Familie auf dem TV." },
    es: { title: "Trivia en pantalla grande", body: "Juega con amigos y familia en la TV." },
    fr: { title: "Trivia sur grand écran", body: "Joue avec tes amis et ta famille sur la TV." },
    it: { title: "Trivia sul grande schermo", body: "Gioca con amici e famiglia sulla TV." },
    pt: { title: "Trivia na tela grande", body: "Jogue com amigos e família na TV." },
  },
  league_results: {
    ka: { title: "გასული კვირის შედეგები მზადაა", body: "ნახე, სად დაასრულე და წაიღე ჯილდო." },
    en: { title: "Last week's results are in", body: "See where you finished and claim your reward." },
    de: { title: "Die Ergebnisse der letzten Woche sind da", body: "Sieh dir deine Platzierung an und hol deine Belohnung." },
    es: { title: "Los resultados de la semana ya están", body: "Mira dónde quedaste y reclama tu recompensa." },
    fr: { title: "Les résultats de la semaine sont là", body: "Vois ton classement et récupère ta récompense." },
    it: { title: "I risultati della settimana sono arrivati", body: "Guarda dove sei arrivato e ritira il premio." },
    pt: { title: "Os resultados da semana chegaram", body: "Veja onde você ficou e resgate sua recompensa." },
  },
  league_lastchance: {
    ka: { title: "ლიგა ამაღამ იხურება", body: "შენ #{rank} ადგილზე ხარ — ერთი თამაში გწყვეტს." },
    en: { title: "League closes tonight", body: "You're #{rank} — one game could move you up." },
    de: { title: "Die Liga schließt heute Abend", body: "Du bist auf Platz {rank} — ein Spiel kann dich hochbringen." },
    es: { title: "La liga cierra esta noche", body: "Vas #{rank} — una partida puede subirte." },
    fr: { title: "La ligue ferme ce soir", body: "Tu es #{rank} — une partie peut te faire monter." },
    it: { title: "La lega chiude stasera", body: "Sei #{rank} — una partita può farti salire." },
    pt: { title: "A liga fecha hoje à noite", body: "Você está em #{rank} — um jogo pode te subir." },
  },
  winback_3: {
    ka: { title: "ახალი ტრივია გელოდება", body: "ახალი კითხვები დაემატა — შემოიხედე." },
    en: { title: "New trivia is waiting", body: "Fresh questions were added — come take a look." },
    de: { title: "Neues Trivia wartet", body: "Neue Fragen sind da — schau vorbei." },
    es: { title: "Hay trivia nueva esperando", body: "Se añadieron preguntas nuevas — ven a verlas." },
    fr: { title: "Du nouveau trivia t'attend", body: "De nouvelles questions sont là — viens voir." },
    it: { title: "Nuovi trivia ti aspettano", body: "Sono arrivate nuove domande — vieni a vederle." },
    pt: { title: "Tem trivia nova esperando", body: "Perguntas novas chegaram — venha ver." },
  },
  winback_7: {
    ka: { title: "შექმენი შენი ტრივია", body: "ააწყვე ქვიზი და გამოიწვიე მეგობრები." },
    en: { title: "Create your own trivia", body: "Build a quiz and challenge your friends." },
    de: { title: "Erstell dein eigenes Trivia", body: "Bau ein Quiz und fordere deine Freunde heraus." },
    es: { title: "Crea tu propia trivia", body: "Arma un quiz y reta a tus amigos." },
    fr: { title: "Crée ton propre trivia", body: "Monte un quiz et défie tes amis." },
    it: { title: "Crea il tuo trivia", body: "Costruisci un quiz e sfida i tuoi amici." },
    pt: { title: "Crie sua própria trivia", body: "Monte um quiz e desafie seus amigos." },
  },
  winback_30: {
    ka: { title: "შენი გვირგვინი გენატრება", body: "დაბრუნდი — ერთი სწრაფი თამაში საკმარისია." },
    en: { title: "Your crown misses you", body: "Come back — one quick game is all it takes." },
    de: { title: "Deine Krone vermisst dich", body: "Komm zurück — ein schnelles Spiel genügt." },
    es: { title: "Tu corona te extraña", body: "Vuelve — con una partida rápida basta." },
    fr: { title: "Ta couronne s'ennuie de toi", body: "Reviens — une partie rapide suffit." },
    it: { title: "La tua corona sente la tua mancanza", body: "Torna — basta una partita veloce." },
    pt: { title: "Sua coroa sente sua falta", body: "Volte — um jogo rápido já basta." },
  },
  creator_digest: {
    ka: { title: "შენი ტრივიები ითამაშეს", body: "ამ კვირაში შენი ტრივიები {count}-ჯერ ითამაშეს." },
    en: { title: "Your trivias got played", body: "Your trivias were played {count} times this week." },
    de: { title: "Deine Trivias wurden gespielt", body: "Deine Trivias wurden diese Woche {count} Mal gespielt." },
    es: { title: "Jugaron tus trivias", body: "Tus trivias se jugaron {count} veces esta semana." },
    fr: { title: "Tes trivias ont été joués", body: "Tes trivias ont été joués {count} fois cette semaine." },
    it: { title: "I tuoi trivia sono stati giocati", body: "I tuoi trivia sono stati giocati {count} volte questa settimana." },
    pt: { title: "Suas trivias foram jogadas", body: "Suas trivias foram jogadas {count} vezes esta semana." },
  },
  friend_request: {
    ka: { title: "მეგობრობის მოთხოვნა", body: "{name} გთხოვს დამეგობრებას." },
    en: { title: "New friend request", body: "{name} wants to be friends." },
    de: { title: "Neue Freundschaftsanfrage", body: "{name} möchte mit dir befreundet sein." },
    es: { title: "Nueva solicitud de amistad", body: "{name} quiere ser tu amigo." },
    fr: { title: "Nouvelle demande d'ami", body: "{name} veut devenir ton ami." },
    it: { title: "Nuova richiesta di amicizia", body: "{name} vuole essere tuo amico." },
    pt: { title: "Novo pedido de amizade", body: "{name} quer ser seu amigo." },
  },
  friend_accept: {
    ka: { title: "მოთხოვნა მიღებულია", body: "{name} დაგიდასტურა — გამოიწვიე თამაშში." },
    en: { title: "Request accepted", body: "{name} accepted your request — challenge them." },
    de: { title: "Anfrage angenommen", body: "{name} hat deine Anfrage angenommen — fordere sie heraus." },
    es: { title: "Solicitud aceptada", body: "{name} aceptó tu solicitud — desafíalo." },
    fr: { title: "Demande acceptée", body: "{name} a accepté ta demande — défie-le." },
    it: { title: "Richiesta accettata", body: "{name} ha accettato la tua richiesta — sfidalo." },
    pt: { title: "Pedido aceito", body: "{name} aceitou seu pedido — desafie-o." },
  },
  room_ping: {
    ka: { title: "{name} გეძახის", body: "მოთამაშეები ოთახში „{room}“ გელოდებიან — დაბრუნდი და დაიწყე თამაში." },
    en: { title: "{name} is calling you", body: "Players are waiting in {room} — come back and start the game." },
    de: { title: "{name} ruft dich", body: "Die Spieler warten in {room} — komm zurück und starte das Spiel." },
    es: { title: "{name} te está llamando", body: "Los jugadores esperan en {room} — vuelve y empieza la partida." },
    fr: { title: "{name} t'appelle", body: "Les joueurs attendent dans {room} — reviens et lance la partie." },
    it: { title: "{name} ti sta chiamando", body: "I giocatori aspettano in {room} — torna e avvia la partita." },
    pt: { title: "{name} está chamando você", body: "Os jogadores esperam em {room} — volte e comece o jogo." },
  },
  team_poke: {
    ka: { title: "{name} გეძახის — დრო მიდის!", body: "შენი სვლაა Trivia Battle-ში და გუნდი ქულებს კარგავს. დაბრუნდი და უპასუხე." },
    en: { title: "{name} is calling you — the clock is running!", body: "It is your turn in Trivia Battle and your team is losing points. Come back and answer." },
    de: { title: "{name} ruft dich — die Uhr läuft!", body: "Du bist im Trivia Battle dran und dein Team verliert Punkte. Komm zurück und antworte." },
    es: { title: "{name} te llama — ¡el tiempo corre!", body: "Es tu turno en Trivia Battle y tu equipo está perdiendo puntos. Vuelve y responde." },
    fr: { title: "{name} t'appelle — le chrono tourne !", body: "C'est ton tour dans Trivia Battle et ton équipe perd des points. Reviens répondre." },
    it: { title: "{name} ti chiama — il tempo scorre!", body: "È il tuo turno in Trivia Battle e la tua squadra sta perdendo punti. Torna e rispondi." },
    pt: { title: "{name} está a chamar-te — o tempo corre!", body: "É a tua vez no Trivia Battle e a tua equipa está a perder pontos. Volta e responde." },
  },
  challenge_beaten: {
    ka: { title: "შენი რეკორდი მოხსნეს", body: "{name} შენს ქულას აჯობა — დაიბრუნე პირველობა." },
    en: { title: "Your score was beaten", body: "{name} beat your score — take it back." },
    de: { title: "Dein Rekord wurde geknackt", body: "{name} hat deinen Punktestand geschlagen — hol ihn dir zurück." },
    es: { title: "Superaron tu puntuación", body: "{name} superó tu puntuación — recupérala." },
    fr: { title: "Ton score a été battu", body: "{name} a battu ton score — reprends-le." },
    it: { title: "Il tuo punteggio è stato battuto", body: "{name} ha battuto il tuo punteggio — riprenditelo." },
    pt: { title: "Bateram sua pontuação", body: "{name} superou sua pontuação — recupere-a." },
  },
};

/** Fill {param} placeholders. Unknown placeholders are left visible on purpose. */
export function fill(msg: PushMessage, params?: Record<string, string | number>): PushMessage {
  if (!params) return msg;
  const sub = (s: string) =>
    s.replace(/\{(\w+)\}/g, (m, key) => (params[key] !== undefined ? String(params[key]) : m));
  return { title: sub(msg.title), body: sub(msg.body) };
}

/** Message for a kind in the recipient's language, English when unknown. */
export function pushMessage(
  kind: PushKind,
  lang: string | null | undefined,
  params?: Record<string, string | number>,
): PushMessage {
  const byLang = PUSH_COPY[kind];
  return fill(byLang[lang ?? "en"] ?? byLang.en, params);
}
