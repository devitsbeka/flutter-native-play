import { V3 } from "../theme";
import { ViewLink } from "./ViewLink";
import heroScene from "@/assets/figma-landing/hero-scene.png";

interface ProHeroProps {
  title: string;
  subtitle: string;
  cta: string;
  onClick: () => void;
}

/**
 * The full-bleed blue promo: 439px tall, the title and a lighter line over
 * a duotone picture, the link at the foot. The picture is the app's own
 * Trivia King scene, desaturated and multiplied into the blue so it reads
 * as one surface the way the reference's arena does.
 */
export function ProHero({ title, subtitle, cta, onClick }: ProHeroProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ height: 439, background: V3.blue, fontFamily: V3.font, color: "#ffffff" }}
    >
      <div
        className="absolute left-0 right-0"
        style={{
          top: 58,
          height: 346,
          // The picture multiplies into THIS blue: the mask below makes the
          // box its own stacking context, so the section's blue behind it is
          // not what the blend sees.
          background: V3.blue,
          maskImage: "linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)",
        }}
      >
        <img
          src={heroScene}
          alt=""
          draggable={false}
          className="w-full h-full object-cover"
          style={{ filter: "grayscale(1) contrast(1.08) brightness(1.05)", mixBlendMode: "multiply" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(42,136,189,0.25) 0%, rgba(42,136,189,0) 40%, rgba(42,136,189,0.35) 100%)" }} />
      </div>

      <div className="relative" style={{ paddingLeft: 28, paddingRight: 28, paddingTop: 22 }}>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700, lineHeight: "30px", letterSpacing: "-0.005em" }}>{title}</h2>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 600, lineHeight: "24px", color: "#d7dbe0" }}>{subtitle}</p>
      </div>

      <div className="absolute" style={{ left: 28, top: 389 }}>
        <ViewLink label={cta} onClick={onClick} color="#ffffff" size={17} weight={700} />
      </div>
    </section>
  );
}
