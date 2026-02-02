

# გეგმა: შესვლის გვერდის ტექსტის და ავატარის გაუმჯობესება

## რას შევცვლი

### 1. ტექსტის ცვლილება შესვლის რეჟიმში

**ახლა (Login mode):**
- სათაური: "მობრძანდი!"  
- ქვესათაური: "შედი შენს ანგარიშზე"

**შემდეგ (Login mode):**
- სათაური: "გამარჯობა!"
- ქვესათაური: _(არაფერი)_

### 2. ავატარის ვიდეოს ლოგიკა

**ახლა:**
- ვიდეო უსასრულოდ ბრუნავს (loop)
- კამერის აიკონი ყოველთვის ჩანს

**შემდეგ:**
- ვიდეო მხოლოდ 1-ჯერ ითამაშებს
- ვიდეოს დასრულების შემდეგ:
  - კამერის აიკონი გამოჩნდება ანიმაციით (pulse/bounce)
  - ეს მიუთითებს რომ მომხმარებელს შეუძლია ავატარის შეცვლა

---

## ფაილები რომლებშიც ცვლილებები იქნება

### 1. `src/components/home/GuestWelcomePanel.tsx`

**ცვლილებები:**
- ხაზი 145-149: შევცვლი login რეჟიმის ტექსტებს
  - "მობრძანდი!" → "გამარჯობა!" (ორივე რეჟიმში ერთნაირი)
  - Login-ზე ქვესათაური ცარიელი იქნება
- დავამატებ `videoEnded` state ვიდეოს დასრულების ტრეკინგისთვის
- `PingPongVideo` ნაცვლად გამოვიყენებ `<video>` ელემენტს `loop={false}` და `onEnded` ჰენდლერით
- კამერის badge-ს დავამატებ pulse ანიმაციას ვიდეოს დასრულების შემდეგ

### 2. `src/components/home/DesktopGuestSplitLayout.tsx`

**ცვლილებები:**
- ხაზი 148-153: იგივე ტექსტის ცვლილება (Login mode)
- იგივე ვიდეო/კამერა ლოგიკა

### 3. `src/components/shared/SinglePlayVideo.tsx` (ახალი კომპონენტი)

**შექმნა:**
- ახალი ვიდეო კომპონენტი რომელიც მხოლოდ 1-ჯერ ითამაშებს
- `onEnded` callback ვიდეოს დასრულებისას
- Reusable კომპონენტი სხვა ადგილებისთვისაც

---

## ტექნიკური დეტალები

### ახალი State
```typescript
const [videoEnded, setVideoEnded] = useState(false);
```

### კამერის Badge ანიმაცია (ვიდეოს შემდეგ)
```typescript
<motion.div 
  className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 shadow-md z-20"
  initial={videoEnded ? { scale: 0 } : { scale: 1 }}
  animate={videoEnded ? { 
    scale: [0, 1.3, 1],
    opacity: [0, 1, 1]
  } : {}}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
  <motion.div
    animate={videoEnded ? { scale: [1, 1.2, 1] } : {}}
    transition={{ duration: 1.5, repeat: 2, ease: "easeInOut" }}
  >
    <Camera className="w-3.5 h-3.5 text-primary-foreground" />
  </motion.div>
</motion.div>
```

### ვიდეოს ელემენტი (loop-ის გარეშე)
```typescript
<video
  src={guestWelcomeVideo}
  muted
  playsInline
  autoPlay
  onEnded={() => setVideoEnded(true)}
  className="w-full h-full object-cover"
  style={{ objectPosition: 'center 20%', transform: 'scale(1.3)' }}
/>
```

---

## შედეგი

**Login რეჟიმში:**
- მარტივი მისალმება: "გამარჯობა!" (ქვესათაურის გარეშე)
- ვიდეო 1-ჯერ ითამაშებს
- ვიდეოს შემდეგ კამერის აიკონი "გამოხტება" ანიმაციით
- მომხმარებელს ესმის რომ შეუძლია ავატარის შეცვლა

