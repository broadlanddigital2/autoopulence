"use client";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, ChevronDown, Menu, Phone, MapPin, Sparkles, UserRound } from "lucide-react";
import { categories, getServiceFromPrice } from "@/lib/services";

export function Header() {
  function closeParentMenu(event: React.MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a")) event.currentTarget.closest("details")?.removeAttribute("open");
  }
  function closeOtherMenus(event: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open) return;
    document.querySelectorAll<HTMLDetailsElement>("details[data-nav-menu][open]").forEach(menu => {
      if (menu !== event.currentTarget) menu.removeAttribute("open");
    });
  }
  function trackServicesMenu() {
    if (window.location.pathname !== "/services") window.history.pushState({}, "", "/services");
  }
  return <header className="site-header"><div className="shell header-inner">
    <Link href="/" aria-label="Auto Opulence home" className="brand"><img src="/auto-opulence-logo.svg" alt="Auto Opulence Detailing Excellence" width="290" height="94" decoding="async" /></Link>
    <nav className="desktop-nav" aria-label="Main navigation">
      <details className="mega-menu" data-nav-menu onToggle={closeOtherMenus}><summary onClick={trackServicesMenu}>Services <ChevronDown size={15} /></summary><div className="mega-panel" onClick={closeParentMenu}>
        <div className="shell mega-intro"><div><span>Services &amp; prices</span><strong>Choose the right care for your vehicle.</strong></div><Link href="/#book" className="mega-book-promo"><CalendarCheck2 size={22} /><span><small>Ready when you are</small><strong>Book your service</strong></span><ArrowRight size={18} /></Link></div>
        <div className="shell mega-grid">{categories.map((category) => { const mainServices = category.services.filter((service) => !service.isAddOn); const startingService = mainServices[0] ?? category.services[0]; return <section className="mega-card" key={category.slug} style={{ borderTopColor: category.accent }}><Link href={`/category/${category.slug}`} className="mega-card-image"><img src={category.image} alt={`${category.title} at Auto Opulence Norwich`} width="1200" height="800" loading="lazy" decoding="async" /><span>{category.eyebrow}</span></Link><div className="mega-card-body"><Link href={`/category/${category.slug}`} className="mega-title"><span>{category.title}</span><strong>From {getServiceFromPrice(startingService)}</strong></Link><nav aria-label={`${category.title} services`}>{mainServices.slice(0, 4).map((service) => <Link href={`/service/${service.slug}`} key={service.slug}>{service.title}<ArrowRight size={13} /></Link>)}</nav><Link href={`/category/${category.slug}`} className="mega-all">Explore all services <ArrowRight size={15} /></Link></div></section>; })}</div>
        <div className="mega-footer shell"><span><Sparkles size={16} /> Professional vehicle care at our Norwich studio</span><div><Link href="/guides">Guides &amp; advice</Link><Link href="/contact">Ask for advice</Link><Link href="/#book">Book now <ArrowRight size={14} /></Link></div></div>
      </div></details>
      <details className="resource-menu" data-nav-menu onToggle={closeOtherMenus}><summary>Explore <ChevronDown size={15} /></summary><div className="resource-panel" onClick={closeParentMenu}>
        <Link href="/locations"><span>Local services</span><strong>Locations</strong><small>Vehicle care across Norwich and Norfolk.</small></Link>
        <Link href="/business-sectors"><span>Commercial care</span><strong>For Business</strong><small>Fleet, dealership and trade solutions.</small></Link>
        <Link href="/gallery"><span>Recent finishes</span><strong>Gallery</strong><small>Explore completed vehicle-care work.</small></Link>
        <Link href="/case-studies"><span>Detailed results</span><strong>Case Studies</strong><small>See processes, services and outcomes.</small></Link>
        <Link href="/guides"><span>Helpful advice</span><strong>Care Guides</strong><small>Choose and maintain the right treatment.</small></Link>
      </div></details>
      <Link href="/about">About</Link><Link href="/contact">Contact</Link>
    </nav>
    <div className="header-actions"><a href="tel:03300536925" className="phone-link"><Phone size={16} /> 0330 053 6925</a><Link href="/login" className="customer-login-link" aria-label="Customer login"><UserRound size={17} aria-hidden="true" /><span>Customer login</span></Link><Link href="/#book" className="button button-small header-book-button">Book now</Link>
      <details className="mobile-menu" data-nav-menu onToggle={closeOtherMenus}><summary aria-label="Open navigation"><Menu /></summary><div className="mobile-menu-panel" onClick={closeParentMenu}><details className="mobile-nav-group" open><summary onClick={trackServicesMenu}>Services <ChevronDown size={15} /></summary><div>{categories.map((category) => <Link key={category.slug} href={`/category/${category.slug}`}>{category.title}</Link>)}</div></details><details className="mobile-nav-group"><summary>Explore <ChevronDown size={15} /></summary><div><Link href="/locations">Locations</Link><Link href="/business-sectors">For Business</Link><Link href="/gallery">Gallery</Link><Link href="/case-studies">Case Studies</Link><Link href="/guides">Guides &amp; Advice</Link></div></details><Link href="/about">About Auto Opulence</Link><Link href="/contact">Contact us</Link><Link href="/login" className="mobile-account"><UserRound size={17} aria-hidden="true" /> Customer login</Link><Link href="/#book" className="mobile-book">Book a service</Link></div></details>
    </div>
  </div></header>;
}

export function Footer() {
  return <footer className="site-footer"><section className="shell footer-brand-section" aria-labelledby="group-brands-title"><p className="footer-label" id="group-brands-title">Group brands</p><div className="footer-brand-grid"><a href="https://racecargraphics.uk/" target="_blank" rel="noopener noreferrer" aria-label="Race Car Graphics UK website"><img src="/images/brands/race-car-graphics-logo.png" alt="Race Car Graphics UK" loading="lazy" /></a><a href="https://broadlanddigital.co.uk/" target="_blank" rel="noopener noreferrer" aria-label="Broadland Digital website"><img src="https://racecargraphics.uk/img/logos/bd-logo.svg" alt="Broadland Digital" loading="lazy" /></a><div><img src="/images/brands/consensus-media-logo.svg" alt="Consensus Media" loading="lazy" /></div><Link href="/" aria-label="Auto Opulence home"><img src="/images/brands/auto-opulence-logo-white.svg" alt="Auto Opulence Detailing Excellence" loading="lazy" /></Link></div></section><div className="shell footer-grid">
    <section aria-label="About Auto Opulence"><img src="/auto-opulence-logo.svg" alt="Auto Opulence" className="footer-logo" width="290" height="94" loading="lazy" decoding="async" /><p>Professional valeting, washing, polishing and equipped bay hire in Norwich.</p></section>
    <section aria-label="Visit and explore"><p className="footer-label">Visit</p><address><MapPin size={17} /> <span>Unit 7 Consensus House<br />St Faiths Road, Norwich, NR6 7BW</span></address><nav className="footer-links" aria-label="Footer navigation"><Link href="/about">About</Link><Link href="/locations">Locations</Link><Link href="/business-sectors">For Business</Link><Link href="/gallery">Gallery</Link><Link href="/case-studies">Case Studies</Link><Link href="/guides">Guides</Link></nav></section>
    <address aria-label="Contact Auto Opulence"><p className="footer-label">Contact</p><a href="tel:03300536925">0330 053 6925</a><a href="mailto:valeting@autoopulence.co.uk">valeting@autoopulence.co.uk</a><Link href="/contact">Contact us</Link><nav className="footer-social-links" aria-label="Auto Opulence social media"><a href="https://www.instagram.com/autoopulencedetailing" target="_blank" rel="noopener noreferrer" aria-label="Follow Auto Opulence on Instagram"><strong aria-hidden="true">IG</strong><span>Instagram</span></a><a href="https://www.facebook.com/autoopulence" target="_blank" rel="noopener noreferrer" aria-label="Follow Auto Opulence on Facebook"><strong aria-hidden="true">f</strong><span>Facebook</span></a></nav></address>
  </div><div className="shell footer-bottom"><small>© 2026 Auto Opulence. Detailing excellence in Norwich, Norfolk.</small><nav aria-label="Legal information"><Link href="/privacy">Privacy Policy</Link><Link href="/cookies">Cookie Policy</Link><button type="button" onClick={() => window.dispatchEvent(new Event("ao:cookie-settings"))}>Cookie settings</button></nav></div></footer>;
}
