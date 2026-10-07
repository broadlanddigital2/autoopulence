"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

const slides = [
  {
    image: "/images/home-banners/auto-opulence.webp",
    alt: "Pearl grey luxury SUV inside a professional detailing studio",
    kicker: "Auto Opulence · Norwich",
    title: "Care that shows in every reflection.",
    text: "Professional vehicle care and a fully equipped indoor bay, all under one roof in Norwich.",
    href: "#services",
    cta: "Explore our services",
  },
  {
    image: "/images/home-banners/standard-valet.webp",
    alt: "Graphite performance car prepared for a professional standard valet",
    kicker: "Complete vehicle care",
    title: "Standard valet, inside and out.",
    text: "A coordinated exterior and interior valet for a clean, comfortable and well-presented vehicle.",
    price: "From £70",
    href: "/service/premium-exterior-interior-valet",
    cta: "View standard valet",
  },
  {
    image: "/images/home-banners/ceramic-coating.webp",
    alt: "Glossy black performance car with ceramic protection under detailing lights",
    kicker: "Long-term paint protection",
    title: "Seven-year ceramic protection.",
    text: "Deep gloss, easier maintenance and durable protection following the required decontamination and clay-bar preparation.",
    price: "From £445",
    note: "Includes minimum preparation and coating",
    href: "/service/new-car-7-year-ceramic-coating",
    cta: "Explore ceramic coating",
  },
  {
    image: "/images/home-banners/valet-bay-hire.webp",
    alt: "Professional indoor valet bay with a silver performance car",
    kicker: "Professional indoor workspace",
    title: "Norfolk’s best-equipped valet bay.",
    text: "Inspection lighting, indoor washing and spotless water for private enthusiasts and professional detailers—whatever the weather.",
    price: "From £50",
    note: "Trade hire · public hire from £80",
    href: "/category/valet-bay-hire",
    cta: "View bay hire",
  },
];

export function HomeHeroCarousel() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setActive(index => (index + 1) % slides.length), 7000);
    return () => window.clearTimeout(timer);
  }, [active]);

  const slide = slides[active];
  const move = (direction: number) => setActive(index => (index + direction + slides.length) % slides.length);

  return <section className="home-campaign-hero" aria-roledescription="carousel" aria-label="Auto Opulence services">
    <div className="home-campaign-images">{slides.map((item, index) => <img className={active === index ? "is-active" : ""} src={item.image} alt={item.alt} aria-hidden={active !== index} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} key={item.image} />)}</div>
    <div className="home-campaign-shade" aria-hidden="true" />
    <div className="shell home-campaign-layout">
      <div className="home-campaign-copy" aria-live="polite" aria-atomic="true">
        <p className="kicker">{slide.kicker}</p>
        <h1>{slide.title}</h1>
        <p className="hero-intro">{slide.text}</p>
        {slide.price && <div className="campaign-price"><span>{slide.price}</span>{slide.note && <small>{slide.note}</small>}</div>}
        {!slide.price && <div className="hero-points"><span><CheckCircle2 /> Tailored to your vehicle</span><span><ShieldCheck /> Professional products & equipment</span></div>}
        <Link className="button campaign-cta" href={slide.href}>{slide.cta} <ArrowRight size={18} /></Link>
      </div>
      <div className="campaign-count" aria-hidden="true"><strong>0{active + 1}</strong><span>/ 0{slides.length}</span></div>
    </div>
    <div className="shell campaign-controls">
      <button type="button" aria-label="Previous banner" onClick={() => move(-1)}><ChevronLeft /></button>
      <div>{slides.map((item, index) => <button type="button" className={active === index ? "is-active" : ""} aria-label={`Show ${item.title}`} aria-current={active === index ? "true" : undefined} onClick={() => setActive(index)} key={item.title} />)}</div>
      <button type="button" aria-label="Next banner" onClick={() => move(1)}><ChevronRight /></button>
    </div>
  </section>;
}
