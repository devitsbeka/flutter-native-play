

# გეგმა: ნაბიგაციის სისწრაფის გაუმჯობესება

## პრობლემის ანალიზი

ნაბიგაციის დაყოვნება გამოწვეულია სამი ფაქტორით:

1. **Lazy Loading + Suspense** - გვერდები lazy-loaded არის და `PageSkeleton` ჩანს ჩატვირთვისას
2. **გვიანი Prefetch** - prefetch მხოლოდ `touchStart`-ზე ხდება, მაგრამ ბევრი მომხმარებელი სწრაფად ჭყიტავს
3. **მძიმე Data Fetching** - თითოეულ გვერდზე მრავალი API call ხდება mount-ზე

## გადაწყვეტა

### 1. Eager Prefetch ნაბიგაციის სექციებისთვის

როდესაც `UniversalBottomNav` მოუნთდება, დავიწყოთ ყველა მთავარი გვერდის chunk-ის პრელოადინგი:

```typescript
// UniversalBottomNav.tsx
useEffect(() => {
  // Eagerly preload all main route chunks on nav mount
  const timer = setTimeout(() => {
    import("@/pages/Discover");
    import("@/pages/PowerUps");
    import("@/pages/Leaderboards");
    import("@/pages/TeamV2");
  }, 1000); // After initial render settles
  
  return () => clearTimeout(timer);
}, []);
```

### 2. Network Idle Prefetch

გამოვიყენოთ `requestIdleCallback` ან `setTimeout` რომ დავიჭიროთ browser-ის idle დრო:

```typescript
// useNavigationPrefetch.ts - Add eager prefetching
useEffect(() => {
  // Use idle time to prefetch all route data
  const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  
  const handle = idleCallback(() => {
    // Prefetch data for common routes
    prefetchAllTiers(); // Leaderboards
    prefetchShopData(); // Shop
    prefetchExploreData(); // Discover + Team
  }, { timeout: 5000 });
  
  return () => {
    if (window.cancelIdleCallback) {
      window.cancelIdleCallback(handle);
    }
  };
}, []);
```

### 3. Optimistic Navigation (Instant Feel)

მიმდინარე NavButton-ს აქვს `whileTap` ანიმაცია რომელიც ართმევს მცირე დაყოვნებას. შეცვალოთ:

```typescript
// NavButton - Remove whileHover/whileTap or make them faster
<motion.button
  onClick={onClick}
  className="relative flex flex-col items-center justify-center w-14 h-12 flex-shrink-0 gap-1 active:scale-95 transition-transform duration-75"
  // Remove whileTap={{ scale: 0.95 }} - use CSS instead
>
```

### 4. React Router `unstable_viewTransition` (Optional Enhancement)

თუ გვინდა smooth page transitions:

```typescript
// Use Link with viewTransition for smoother feel
navigate(path, { unstable_viewTransition: true });
```

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/components/layout/UniversalBottomNav.tsx` | Eager chunk preloading + CSS transitions |
| `src/hooks/useNavigationPrefetch.ts` | Idle-time data prefetching |
| `src/App.tsx` | (optional) viewTransition config |

---

## დეტალური ცვლილებები

### UniversalBottomNav.tsx

```typescript
// Add at component level - eager preload chunks
useEffect(() => {
  // Preload main route chunks after initial render
  const timer = setTimeout(() => {
    // Load all main page chunks in background
    import("@/pages/Discover");
    import("@/pages/PowerUps"); 
    import("@/pages/Leaderboards");
    import("@/pages/TeamV2");
  }, 1500);
  
  return () => clearTimeout(timer);
}, []);

// NavButton - switch from framer whileTap to CSS for snappier response
<button
  onClick={onClick}
  className="relative flex flex-col items-center justify-center w-14 h-12 flex-shrink-0 gap-1 active:scale-95 transition-transform duration-75"
>
```

### useNavigationPrefetch.ts

```typescript
// Add idle-time prefetching
useEffect(() => {
  // Only prefetch when browser is idle
  const idleCallback = 'requestIdleCallback' in window 
    ? window.requestIdleCallback 
    : (cb: () => void) => setTimeout(cb, 2000);
  
  const handle = idleCallback(() => {
    // Prefetch all route data in background
    prefetchAllTiers();
    prefetchShopData();
    prefetchExploreData();
  }, { timeout: 10000 });
  
  return () => {
    if ('cancelIdleCallback' in window) {
      window.cancelIdleCallback(handle);
    }
  };
}, [prefetchAllTiers, prefetchShopData, prefetchExploreData]);
```

---

## მოსალოდნელი შედეგი

| ფაქტორი | მანამდე | შემდეგ |
|---------|---------|--------|
| Page chunk load | ~200-500ms on click | 0ms (pre-loaded) |
| Data fetch | Starts on mount | Pre-cached |
| Button feedback | Framer spring delay | Instant CSS |
| Overall feel | Laggy | Smooth/Instant |

---

## თანმიმდევრობა

1. **ჯერ**: NavButton-ის CSS transition-ზე გადაყვანა (instant feedback)
2. **შემდეგ**: Eager chunk preloading useEffect-ში
3. **ბოლოს**: Idle-time data prefetching

