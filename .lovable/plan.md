
# Translate All Remaining Hardcoded Georgian Strings in TV/Controller Screens

## Complete List of Hardcoded Georgian Strings Found

### TVPairingScreenV3.tsx (TV pairing code display)
1. `"TV რეჟიმი"` -- "TV Mode"
2. `"მოემზადეთ სახალისო თამაშისთვის!"` -- "Get ready for a fun game!"
3. `"შეიყვანეთ ეს კოდი თქვენს ტელეფონზე"` -- "Enter this code on your phone"
4. `"გახსენით"` -- "Open"
5. `"შეიყვანეთ კოდი"` -- "Enter code"
6. `"მზად ხართ!"` -- "You're ready!"
7. `"ველოდებით მოთამაშეებს..."` -- "Waiting for players..."

### TVPairingScreen.tsx (older pairing screen)
8. `"შეიყვანეთ კოდი თქვენს ტელეფონში"` -- "Enter the code on your phone"
9. `"ან გადადით:"` -- "Or go to:"
10. `"ველოდებით..."` -- "Waiting..."
11. `"თამაშის დაწყება"` -- "Start Game"

### TVLobbyScreenV2.tsx (TV lobby)
12. `"TV ოთახი"` -- "TV Room" (default room name fallback)
13. `"დაამატე რიგში"` / `"აირჩიე კატეგორია"` -- "Add to queue" / "Choose category"
14. `"შემთხვევითი"` (x2) -- "Random"
15. `"რაუნდი"` -- "Round" (fallback for queue item without name)
16. `"მოწვეული"` -- "Invited"
17. `"მოლოდინი..."` -- "Waiting..."
18. `"ან გახსენით"` -- "Or open"
19. `"კოდი: "` -- "Code: "
20. `"ავტო-დაწყება"` -- "Auto-start"
21. `` `დაწყება (${queue.length} რაუნდი)` `` / `"თამაშის დაწყება"` -- "Start (N rounds)" / "Start Game"
22. `"მოლოდინი, ჰოსტმა დაიწყოს თამაში..."` -- "Waiting for host to start..."

### TVQuestionScreen.tsx (TV question display - old)
23. `"კითხვა "` -- "Question "
24. `"უპასუხა"` -- "answered"

### TVQuestionScreenV3.tsx (TV question V3)
25. `"ლიდერბორდი"` -- "Leaderboard"
26. `"ფიქრობს..."` -- "Thinking..."
27. `"უპასუხა"` -- "answered"

### TVQuestionScreenV4.tsx (TV question V4)
28. `"კითხვა"` -- "Question" (vertical label)
29. `"რაუნდი {N}/{M}"` -- "Round N/M"

### TVResultsScreen.tsx (TV results)
30. `"თამაში დასრულდა"` -- "Game Over"
31. `"საბოლოო შედეგები"` -- "Final Results"
32. `"ქულა"` -- "points" (after score)
33. `"დანარჩენი მოთამაშეები"` -- "Other Players"
34. `"მასპინძელს შეუძლია ახალი რაუნდის დაწყება ტელეფონიდან"` -- "Host can start a new round from their phone"

### TVResultsScreenV2.tsx (TV results V2)
35. `"თამაში დასრულდა"` -- "Game Over"
36. `"შემდეგი:"` -- "Next:"
37. `"დააჭირე კონტროლერზე გასაგრძელებლად"` / `"მოლოდინი..."` -- "Press controller to continue" / "Waiting..."
38. `"ახალი რაუნდის დასაწყებად დააჭირე ღილაკს კონტროლერზე"` / `"რაუნდები დასრულდა"` -- "Press button on controller to start new round" / "Rounds finished"
39. `"ლიდერბორდი"` -- "Leaderboard"

### TVIdleScreen.tsx (TV idle between rounds)
40. `"TV კვიზი"` -- "TV Quiz" (default name)
41. `` `რაუნდი ${N} დასრულდა` `` / `"მოელოდეთ თამაშის დაწყებას"` -- "Round N finished" / "Wait for game to start"
42. `"მოთამაშე"` -- "player(s)"
43. `"ლიდერბორდი"` -- "Leaderboard"
44. `` `(${N} რაუნდის შემდეგ)` `` -- "(after N rounds)"
45. `"ამ რაუნდში"` -- "in this round"
46. `"ქულა"` -- "points"
47. `"ჯერ არავინ შემოსულა"` -- "Nobody has joined yet"
48. `"ჰოსტის კონტროლი"` -- "Host Controls"
49. `"კატეგორია:"` / `"შემთხვევითი"` -- "Category:" / "Random"
50. `"შემთხვევითი"` (button) -- "Random"
51. `"ახალი რაუნდი"` / `"დაწყება"` -- "New Round" / "Start"
52. `"შემოუერთდი"` -- "Join"
53. `"მოელოდეთ ჰოსტის მითითებას..."` -- "Waiting for host's instruction..."

### TVRoundIntroScreen.tsx (round intro)
54. `"რაუნდი"` -- "Round"
55. `"კატეგორია"` -- "Category" (fallback)
56. `"მზადაა!"` -- "Ready!"
57. `"მზად ვარ"` -- "I'm ready"
58. `"ველოდებით ჰოსტს..."` -- "Waiting for host..."

### TVPollScreen.tsx (TV poll)
59. `"კოდი"` -- "Code"
60. `"რა ვითამაშოთ?"` / `"ხმა მიეცით!"` -- "What shall we play?" / "Vote!"
61. `"აირჩიეთ რომელი კატეგორიები გსურთ"` / `"აირჩიე მაქსიმუმ 3 ვარიანტი"` -- "Choose which categories you want" / "Choose max 3 options"
62. `"ველოდებით შემოთავაზებებს..."` -- "Waiting for suggestions..."
63. `"აირჩიეთ მაქსიმუმ 3 შემოთავაზებული ვარიანტებიდან"` -- "Choose max 3 from suggested options"
64. `"მოთამაშეები ({N})"` -- "Players (N)"
65. `"ველოდებით მოთამაშეებს..."` -- "Waiting for players..."
66. `"ხმა"` -- "vote(s)"
67. `"ველოდებით ჰოსტს ხმის მიცემის დასაწყებად..."` -- "Waiting for host to start voting..."
68. `"ხმის მიცემა დასრულდა! ჰოსტი ირჩევს რაუნდებს..."` -- "Voting complete! Host is choosing rounds..."
69. `"ხმის მიცემა მიმდინარეობს!"` -- "Voting in progress!"

### TVPollResultsScreen.tsx (TV poll results)
70. `"გამარჯვებული კატეგორიები"` -- "Winning Categories"
71. `` `მომდევნო ${N} რაუნდი` `` -- "Next N rounds"
72. `"კატეგორია"` (fallback) -- "Category"
73. `"კატეგორია"` / `"ტრივია"` (source type badge) -- "Category" / "Trivia"
74. `"მოემზადეთ... თამაში იწყება!"` -- "Get ready... game is starting!"

### TVLeaderboardPanel.tsx
75. `"რეიტინგი"` -- "Rating"
76. `"გათიშული"` -- "Disconnected"
77. `"უპასუხა"` -- "Answered"
78. `"ფიქრობს..."` -- "Thinking..."

### TVBrandingOverlay.tsx
79. `"კოდი:"` -- "Code:"

### TVRoundQueueIndicator.tsx
80. `"რაუნდი"` -- "Round" (vertical label)

### TVRevealScreenV2.tsx
81. `"კითხვა {N} / {M}"` -- "Question N / M"
82. `"შემდეგი კითხვა იწყება..."` -- "Next question starting..."

### TVGameOverScreen.tsx (controller game over)
83. `"რაუნდი დასრულდა!"` / `"თამაში დასრულდა!"` -- "Round Over!" / "Game Over!"
84. `"ლიდერბორდი"` -- "Leaderboard"
85. `"(შენ)"` -- "(you)"
86. `"შემდეგი რაუნდის მოლოდინი..."` -- "Waiting for next round..."
87. `"რაუნდები დასრულდა"` -- "Rounds finished"
88. `"შემდეგი რაუნდი"` -- "Next Round"
89. `"კატეგორიის დამატება"` -- "Add Category"
90. `"არჩევნების დაწყება"` -- "Start Poll"
91. `"გასვლა"` -- "Exit"

### TVScoreboardScreen.tsx
92. `"საბოლოო შედეგები"` -- "Final Results"
93. `"თავიდან თამაში"` -- "Play Again"
94. `"გასვლა"` -- "Exit"

### TVMirrorButton.tsx
95. `"სესია ვერ მოიძებნა"` -- "Session not found"
96. `"შეიყვანე 4-ციფრიანი კოდი..."` -- "Enter 4-digit code from another TV..."
97. `"დაკავშირება..."` -- "Connecting..."

### ControllerCodeEntry.tsx
98. `"TV თამაშში შესვლა"` -- "Join TV Game"
99. `"თამაში ვერ მოიძებნა. შეამოწმეთ კოდი."` (x3) -- "Game not found. Check the code."
100. `"კოდი უნდა იყოს მინიმუმ 4 სიმბოლო"` (x2) -- "Code must be at least 4 characters"
101. `"ავტორიზებული"` -- "Authorized"
102. `"თამაშის კოდი"` -- "Game Code"
103. `"შეიყვანეთ კოდი"` -- "Enter code"
104. `"შემოსვლა..."` / `"შესვლა"` -- "Joining..." / "Join"

### ControllerQuestion.tsx
105. `"შენი კატეგორიაა!"` -- "It's your category!"
106. `"ამიტომ ამ რაუნდში აკვირდები"` -- "So you're observing this round"
107. `"კითხვა {N}/{M}"` -- "Question N/M"
108. `"ტელევიზორზე უყურე..."` -- "Watch on TV..."
109. `"თამაშიდან გასვლა"` -- "Leave Game"
110. `"მართალია"` / `"მცდარია"` -- "True" / "False" (answer labels)

### ControllerPollResults.tsx
111. `"არ არის გამარჯვებული კატეგორიები"` -- "No winning categories"
112. `"თამაში იწყება!"` -- "Game is starting!"
113. `"თამაშის დაწყება ვერ მოხერხდა"` (x2) -- "Failed to start game"
114. `"ხმის მიცემის შედეგები"` -- "Voting Results"
115. `"ხმა"` -- "vote(s)"
116. `"რაუნდი"` -- "Round"
117. `"რაუნდების რაოდენობა:"` -- "Number of rounds:"
118. `"იწყება..."` / `` `დაწყება (${N} რაუნდი)` `` -- "Starting..." / "Start (N rounds)"

### ControllerPollScreen.tsx
119. `"კატეგორია შემოთავაზებულია!"` -- "Category suggested!"
120. `"შემოთავაზება ვერ მოხერხდა"` -- "Suggestion failed"
121. `"შემოთავაზებულია!"` (trivia) -- "Suggested!"
122. `"შემოთავაზება წაიშალა"` -- "Suggestion removed"
123. `"წაშლა ვერ მოხერხდა"` -- "Removal failed"
124. `"საჭიროა მინიმუმ 2 შემოთავაზება"` -- "At least 2 suggestions needed"
125. `"ხმის მიცემა დაიწყო!"` -- "Voting started!"
126. `` `მაქსიმუმ ${MAX_VOTES} ხმის მიცემა შეგიძლია` `` -- "You can vote for max N"
127. `"აირჩიე კატეგორიები"` (header, x2) -- "Choose Categories"
128. `"არჩეულია:"` -- "Selected:"
129. `"უკვე დამატებულია"` (x2) -- "Already added"
130. `"აირჩიე კატეგორიები"` / `` `დამატება (${N})` `` -- "Choose categories" / "Add (N)"
131. `"აირჩიე ტრივია"` -- "Choose Trivia"
132. `"შენ ჯერ არ გაქვს ტრივიები"` (x2) -- "You don't have trivias yet"
133. `"შენი შეთავაზებული:"` -- "Your suggestions:"
134. `"კატეგორია"` / `"შენი ტრივია - გამოტოვებ"` -- "Category" / "Your trivia - you'll skip"
135. `"ბიბლიოთეკიდან"` (x2) -- "From Library"
136. `"ჩემი ტრივიებიდან"` (x2) -- "From My Trivias"
137. `"მაქსიმალური რაოდენობა მიღწეულია"` -- "Maximum count reached"
138. `"საჭიროა მინ. 2 კატეგორია"` / `"ხმის მიცემის დაწყება"` -- "Need min. 2 categories" / "Start Voting"
139. `"კატეგორიების არჩევა"` -- "Choosing Categories" (guest heading)
140. `"ჰოსტი ამატებს კატეგორიებს..."` -- "Host is adding categories..."
141. `"მალე დაიწყება ხმის მიცემა"` -- "Voting will start soon"
142. `"ჰოსტის არჩევანი"` -- "Host's choice"
143. `"ხმის მიცემა"` -- "Voting" (header)
144. `"აირჩიე მაქსიმუმ N კატეგორია"` -- "Choose max N categories"
145. `"ხმა მისცა:"` -- "Voted:"
146. `"ჰოსტის ტრივია"` / `"კატეგორია"` -- "Host's trivia" / "Category"
147. `"შენი ხმები"` -- "Your votes"

### ControllerDirectSelection.tsx
148. `"კატეგორია დაემატა!"` -- "Category added!"
149. `"დამატება ვერ მოხერხდა"` -- "Addition failed"
150. `"უკვე არჩეულია!"` -- "Already selected!"
151. `"დაემატა!"` (trivia) -- "Added!"
152. `"წაიშალა რიგიდან"` -- "Removed from queue"
153. `"წაშლა ვერ მოხერხდა"` -- "Removal failed"
154. `"აირჩიე მინიმუმ 1 კატეგორია"` -- "Choose at least 1 category"
155. `"აირჩიე კატეგორიები"` (header) -- "Choose Categories"
156. `"არჩეულია:"` -- "Selected:"
157. `"უკვე დამატებულია"` -- "Already added"
158. `"აირჩიე კატეგორიები"` / `` `დამატება (${N})` `` -- "Choose categories" / "Add (N)"
159. `"აირჩიე ტრივია"` -- "Choose Trivia"
160. `"შენ ჯერ არ გაქვს ტრივიები"` -- "You don't have trivias yet"
161. `"კატეგორია"` / `"შენი ტრივია"` -- "Category" / "Your trivia"
162. `"ბიბლიოთეკიდან"` -- "From Library"
163. `"ჩემი ტრივიებიდან"` -- "From My Trivias"
164. `"აირჩიე კატეგორიები თამაშისთვის"` -- "Choose categories for the game"
165. `"არჩეული რაუნდები:"` -- "Selected rounds:"
166. `"აირჩიე მინ. 1 კატეგორია"` / `` `თამაშის დაწყება (${N} რაუნდი)` `` -- "Choose min. 1 category" / "Start Game (N rounds)"

### QRCodeDisplay.tsx
167. `"შემოუერთდი თამაშს"` -- "Join the Game" (default title prop)
168. `"დაასკანერე QR კოდი შენი ტელეფონით"` -- "Scan QR code with your phone" (default subtitle prop)

---

## Implementation Plan

### Step 1: Add ~170 New Locale Keys
Add all keys to `src/locales/en.ts` and `src/locales/ka.ts` in a new `tv` namespace section within `extra` to keep them organized.

### Step 2: Update 24 Files
Each file will:
1. Import `useLanguage` (if not already imported)
2. Call `const { t } = useLanguage()` in the component
3. Replace every hardcoded Georgian string with a `t("extra.xxx")` call

Files to update:
- `TVPairingScreenV3.tsx` (7 strings)
- `TVPairingScreen.tsx` (4 strings)
- `TVLobbyScreenV2.tsx` (11 strings)
- `TVQuestionScreen.tsx` (2 strings)
- `TVQuestionScreenV3.tsx` (3 strings)
- `TVQuestionScreenV4.tsx` (2 strings)
- `TVResultsScreen.tsx` (5 strings)
- `TVResultsScreenV2.tsx` (5 strings)
- `TVIdleScreen.tsx` (14 strings)
- `TVRoundIntroScreen.tsx` (5 strings)
- `TVPollScreen.tsx` (11 strings)
- `TVPollResultsScreen.tsx` (5 strings)
- `TVLeaderboardPanel.tsx` (4 strings)
- `TVBrandingOverlay.tsx` (1 string)
- `TVRoundQueueIndicator.tsx` (1 string)
- `TVRevealScreenV2.tsx` (2 strings)
- `TVGameOverScreen.tsx` (9 strings)
- `TVScoreboardScreen.tsx` (3 strings)
- `TVMirrorButton.tsx` (3 strings)
- `ControllerCodeEntry.tsx` (7 strings)
- `ControllerQuestion.tsx` (6 strings)
- `ControllerPollResults.tsx` (8 strings)
- `ControllerPollScreen.tsx` (30 strings)
- `ControllerDirectSelection.tsx` (18 strings)
- `QRCodeDisplay.tsx` (2 default prop strings)

### Technical Notes
- Many keys can be reused across files (e.g., "Leaderboard", "Category", "Round", "Waiting...")
- Interpolation patterns like `t("extra.roundNofM", { n: roundNumber, m: totalRounds })` will be used for dynamic strings
- Static config objects will get `t()` calls inside the component body
- Some files like `TVMirrorModal.tsx` and `GuestJoinModal.tsx` are already fully translated -- no changes needed
- `ControllerReveal.tsx`, `ControllerResults.tsx`, `ControllerLobby.tsx` are already fully translated -- no changes needed

### Estimated Impact
- ~170 new locale keys in `en.ts` and `ka.ts`
- 24 component files updated
- Zero Georgian strings remaining in TV/Controller user-facing screens after completion
