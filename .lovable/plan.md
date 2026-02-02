
# გეგმა: ავატარის ატვირთვის აღდგენა რეგისტრაციის გვერდზე

## მიმოხილვა

მომხმარებელმა მოითხოვა:
1. **შექმნის რეჟიმში** (რეგისტრაცია) - ავატარის ატვირთვის სექცია უნდა ჩანდეს
2. **შესვლის რეჟიმში** (ლოგინი) - ავატარის სექცია არ უნდა ჩანდეს
3. **მთავარ გვერდზე** - თუ მომხმარებელს ავატარი არ აქვს დაყენებული, ნაჩვენები უნდა იყოს მასკოტის ვიდეო (ერთჯერადი დაკვრა) შეხსენებად

---

## ცვლილებები

### ფაილი 1: `src/components/home/GuestWelcomePanel.tsx`

**აღვადგენთ ავატარის სექციას მხოლოდ რეგისტრაციის რეჟიმისთვის**

ავატარის სექცია (მასკოტის ვიდეო + კამერის ღილაკი) უნდა გამოჩნდეს მხოლოდ მაშინ, როდესაც `isSignUp === true`.

შესვლის რეჟიმში (`isSignUp === false`) ეს სექცია არ გამოჩნდება - მხოლოდ ფორმა იქნება ნაჩვენები.

**დასამატებელი კოდი (ხაზი 153-ის შემდეგ):**
```tsx
{/* Avatar upload - only show in signup mode */}
{isSignUp && (
  <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.2, type: "spring" }}
    className="relative mb-4"
  >
    <motion.div
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <Popover open={showUploadOptions} onOpenChange={setShowUploadOptions}>
        <PopoverTrigger asChild>
          <div className="relative group cursor-pointer">
            <button 
              type="button"
              className="relative rounded-full overflow-hidden focus:outline-none"
              style={{
                width: 110,
                height: 110,
                boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
                border: "3px solid hsl(var(--background))",
              }}
              disabled={isCameraLoading}
            >
              {selectedPhoto ? (
                <img src={selectedPhoto} alt="Avatar" className="w-full h-full object-cover"/>
              ) : (
                <SinglePlayVideo 
                  src={guestWelcomeVideo}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: 'center 20%', transform: 'scale(1.3)' }}
                  onEnded={() => setVideoEnded(true)}
                />
              )}
            </button>
            {/* Camera badge */}
            <motion.div 
              className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 shadow-md z-20"
              initial={{ scale: 0, opacity: 0 }}
              animate={videoEnded ? { scale: [0, 1.3, 1], opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Camera className="w-3.5 h-3.5 text-primary-foreground" />
            </motion.div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          {/* Photo options */}
        </PopoverContent>
      </Popover>
    </motion.div>
  </motion.div>
)}
```

---

### ფაილი 2: `src/components/home/AvatarCircle.tsx`

**დავამატოთ მასკოტის ვიდეოს ჩვენების ფუნქციონალი**

ახალი prop-ის დამატება:
- `showMascotReminder?: boolean` - თუ true და ავატარი არ არის, მასკოტის ვიდეო უკრავს ერთხელ

```tsx
interface AvatarCircleProps {
  // ... არსებული props
  showMascotReminder?: boolean; // Show mascot video as reminder to set avatar
}
```

როდესაც `showMascotReminder` არის true და `animatedAvatarUrl` არ არსებობს, ავატარის ადგილას მასკოტის ვიდეო უნდა ითამაშოს ერთხელ, შემდეგ კი სტატიკური ავატარი ჩანდეს.

---

### ფაილი 3: `src/pages/Index.tsx`

**პასაჟირო თვისების გადაცემა მთავარ გვერდზე**

ყველა AvatarCircle-ს გადაეცემა:
```tsx
showMascotReminder={!!user && !profile?.avatar_url}
```

ეს ნიშნავს: თუ მომხმარებელი შესულია და ავატარი არ აქვს, მასკოტი ერთხელ ითამაშებს.

---

## ვიზუალური შედეგი

### რეგისტრაციის გვერდი (შექმენი)
```
┌─────────────────────────┐
│      გამარჯობა!         │
│ შექმენი შენი პროფილი... │
│                         │
│   ┌───────────────┐     │
│   │   მასკოტი     │ 📷  │ ← ავატარის ვიდეო + კამერა
│   │   (ვიდეო)     │     │
│   └───────────────┘     │
│                         │
│ [სახელი___________]     │
│ [პაროლი___________]     │
│ [შექმენი ანგარიში]      │
│                         │
│ უკვე გაქვს? შესვლა      │
└─────────────────────────┘
```

### შესვლის გვერდი (შესვლა)
```
┌─────────────────────────┐
│      გამარჯობა!         │
│                         │ ← ავატარი არ ჩანს
│ [ელფოსტა/სახელი___]     │
│ [პაროლი___________]     │
│ [    შესვლა      ]      │
│                         │
│ არ გაქვს? შექმენი       │
└─────────────────────────┘
```

### მთავარი გვერდი (ახალი მომხმარებელი ავატარის გარეშე)
```
┌─────────────────────────┐
│                         │
│   ┌─────────────────┐   │
│   │                 │ ✨│
│   │  მასკოტი ვიდეო  │   │ ← ერთხელ უკრავს
│   │  (შემდეგ ავატ.) │   │   შემდეგ ნორმალური ავატარი
│   └─────────────────┘   │
│        დონე 1           │
│                         │
└─────────────────────────┘
```

---

## ტექნიკური დეტალები

### GuestWelcomePanel ცვლილებები:
- ავატარის სექცია wrapped in `{isSignUp && (...)}`
- Popover/Camera functionality აღდგენილი
- videoEnded state უკვე არსებობს, გამოყენებული იქნება

### AvatarCircle ცვლილებები:
- ახალი `showMascotReminder` prop
- Import გჭირდება: `SinglePlayVideo`, `guestWelcomeVideo`
- State: `hasPlayedMascot` - ერთხელ დაკვრის კონტროლი
- localStorage key: `mytrivia_mascot_shown_{userId}` - მომხმარებლისთვის ერთხელ აჩვენოს

### Index.tsx ცვლილებები:
- სამივე AvatarCircle ინსტანსს გადაეცემა `showMascotReminder`
- პირობა: `!!user && !profile?.avatar_url`

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/components/home/GuestWelcomePanel.tsx` | ავატარის სექციის აღდგენა `isSignUp` პირობით |
| `src/components/home/AvatarCircle.tsx` | `showMascotReminder` prop-ის დამატება |
| `src/pages/Index.tsx` | `showMascotReminder` გადაცემა AvatarCircle-ებზე |
