export default function TriviaLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="h-full w-auto max-w-none object-contain"
      >
        <source src="/videos/loading.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
