# Plan: Fix Avatar Display, Mixed Category Icon & Queue Preview Location

## ✅ COMPLETED

All three issues have been fixed:

### Issue 1: Broken Friend Avatars ✅
- Added `resolveAvatarUrl` import
- Updated friend avatar `src` to use `resolveAvatarUrl(friend.avatarUrl)`

### Issue 2: "სხვადასხვა" (Mixed) Category Empty Card ✅
- Added `DynamicIcon` import
- Added special handling for `category_id === "__mixed__"` in library preview
- Shows mystery-box icon (size 80) with purple-to-pink gradient background
- Also shows mystery-box icon (size 24) in the info bar for mixed category

### Issue 3: Queue Preview Location & Format ✅
- Added inline queue preview below category name in all three expanded cards:
  - Random category preview
  - Library category preview  
  - My Trivias preview
- Format: "შემდეგი რაუნდები: 1. {name} 2. {name} ..."
- Hidden the bottom `PreRoomQueuePreview` when a category is selected (since inline preview now shows)
