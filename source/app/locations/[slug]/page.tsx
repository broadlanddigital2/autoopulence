import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarClock, Clock3, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";
import { JsonLd } from "@/components/json-ld";
import { getCaseStudy } from "@/lib/case-studies";
import { getLocation, locations } from "@/lib/content";
import { getServiceCardImage, getServiceImageAlt } from "@/lib/category-presentation";
import { categories, getService, getServiceFromPrice, getServicePrices, type Service } from "@/lib/services";
import { localBusinessSchema, siteUrl } from "@/lib/seo";

const comparisonRows = [
  { slug: "vehicle-washing", bestFor: "Routine cleaning and paint preparation", scope: "Hand washing, vacuum options and bonded-contamination removal", from: "£30" },
  { slug: "vehicle-valeting", bestFor: "Interior, exterior or complete vehicle care", scope: "Maintenance valets, deep interior cleaning and restoration packages", from: "£40" },
  { slug: "vehicle-polishing", bestFor: "Gloss improvement, defect reduction and protection", scope: "Stage 1 enhancement, multi-stage correction and ceramic coating", from: "£295" },
  { slug: "valet-bay-hire", bestFor: "Private enthusiasts and automotive trade users", scope: "Indoor bay, lighting, pressure washer, spotless water and equipment", from: "£50 trade" },
];

function lowestNumericPrice(service: Service) {
  const prices = Object.values(getServicePrices(service)).map((price) => Number(price.amount)).filter((price) => price > 0);
  return prices.length ? Math.min(...prices).toFixed(2) : undefined;
}

export function generateStaticParams() { return locations.map((location) => ({ slug: location.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const location = getLocation(slug);
  if (!location) return {};
  const url = `/locations/${location.slug}`;
  return {
    title: location.title,
    description: location.description,
    alternates: { canonical: url },
    openGraph: {
      title: location.title,
      description: location.description,
      url,
      siteName: "Auto Opulence",
      locale: "en_GB",
      type: "website",
      images: [{ url: location.heroImage, width: 1200, height: 800, alt: location.heroAlt }],
    },
    twitter: { card: "summary_large_image", title: location.title, description: location.description, images: [location.heroImage] },
  };
}

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const location = getLocation(slug);
  if (!location) notFound();

  const pageUrl = `${siteUrl}/locations/${location.slug}`;
  const recommendations = location.recommendedServices.flatMap((recommendation) => {
    const match = getService(recommendation.slug);
    return match ? [{ ...recommendation, ...match }] : [];
  });
  const project = getCaseStudy(location.caseStudySlug);
  const nearbyLocations = location.nearbySlugs.flatMap((nearbySlug) => {
    const nearby = getLocation(nearbySlug);
    return nearby ? [nearby] : [];
  });
  const mapDirections = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${location.name}, Norfolk`)}&destination=${encodeURIComponent("Unit 7 Consensus House, St Faiths Road, Norwich, NR6 7BW")}`;

  const serviceNode = {
    "@type": "Service",
    "@id": `${pageUrl}/#service-area`,
    name: `Vehicle valeting and detailing for ${location.name}`,
    description: location.description,
    provider: { "@id": `${siteUrl}/#business` },
    areaServed: { "@type": "Place", name: location.name },
    serviceType: ["Vehicle valeting", "Hand car washing", "Vehicle polishing", "Ceramic coating", "Valet bay hire"],
    image: `${siteUrl}${location.heroImage}`,
    url: pageUrl,
    offers: recommendations.flatMap(({ service }) => {
      const price = lowestNumericPrice(service);
      return price ? [{
        "@type": "Offer",
        name: `${service.title} from price`,
        price,
        priceCurrency: "GBP",
        availability: "https://schema.org/InStock",
        url: `${siteUrl}/service/${service.slug}`,
        description: service.priceNote || service.short,
      }] : [];
    }),
  };
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      localBusinessSchema,
      {
        "@type": "WebPage",
        "@id": `${pageUrl}/#webpage`,
        url: pageUrl,
        name: location.title,
        description: location.description,
        about: { "@id": `${pageUrl}/#service-area` },
        primaryImageOfPage: { "@id": `${pageUrl}/#primaryimage` },
        inLanguage: "en-GB",
      },
      { "@type": "ImageObject", "@id": `${pageUrl}/#primaryimage`, contentUrl: `${siteUrl}${location.heroImage}`, caption: location.heroAlt },
      serviceNode,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Locations", item: `${siteUrl}/locations` },
          { "@type": "ListItem", position: 3, name: location.name, item: pageUrl },
        ],
      },
    ],
  };

  return <><JsonLd data={schema} /><Header /><main>
    <section className="service-hero location-service-hero">
      <img className="service-hero-image" src={location.heroImage} alt={location.heroAlt} />
      <div className="service-hero-shade" />
      <div className="shell service-hero-content">
        <Link href="/locations" className="back-link"><ArrowLeft size={17} /> All locations</Link>
        <div className="service-hero-copy">
          <p className="kicker">Serving drivers from {location.name}</p>
          <h1>Car valeting for {location.name}.</h1>
          <p>{location.intro}</p>
          <div className="location-hero-actions"><Link href="/#book" className="button">Request a booking <ArrowRight size={18} /></Link><a href={mapDirections} target="_blank" rel="noreferrer" className="location-text-link"><Navigation size={17} /> Plan the route</a></div>
        </div>
        <div className="service-hero-proof location-hero-proof"><MapPin /><strong>Purpose-equipped Norwich facility</strong><span>Real vehicle care · Confirmed appointments</span></div>
      </div>
    </section>

    <section className="section shell editorial-grid location-overview">
      <article>
        <p className="kicker">Local vehicle-care needs</p>
        <h2>Professional care near {location.name}.</h2>
        <p>{location.localNeed}</p>
        <p>{location.localFocus}</p>
        <h2>Visiting Auto Opulence</h2>
        <p>{location.journey}</p>
        <p>{location.arrival}</p>
        <div className="editorial-note"><MapPin /><div><strong>One confirmed business address</strong><p>Unit 7 Consensus House, St Faiths Road, Norwich, Norfolk, NR6 7BW</p></div></div>
      </article>
      <aside aria-label={`Visit planning for ${location.name} customers`}>
        <p className="kicker">Plan the appointment</p>
        <div className="location-plan-item"><Navigation /><span><strong>Route</strong>{location.journey}</span></div>
        <div className="location-plan-item"><CalendarClock /><span><strong>Reserved time</strong>{location.appointmentPlanning}</span></div>
        <div className="location-plan-item"><ShieldCheck /><span><strong>Clear pricing</strong>Choose the service and vehicle size before travelling. Add-ons are shown separately from the required main treatment.</span></div>
        <a href={mapDirections} target="_blank" rel="noreferrer" className="button">Directions from {location.name}</a>
      </aside>
    </section>

    <section className="location-recommendations">
      <div className="section shell">
        <div className="section-heading compact"><div><p className="kicker">Recommended for {location.name}</p><h2>Choose by vehicle condition.</h2></div><p>These are useful starting points for the driving and vehicle-care needs common around {location.name}. We will confirm the right treatment before booking.</p></div>
        <div className="location-service-grid">{recommendations.map(({ service, category, reason }) => {
          const image = getServiceCardImage(service.slug, category.image);
          const imageAlt = getServiceImageAlt(service.slug, `${service.title} at Auto Opulence in Norwich`);
          return <article className="location-service-card" key={service.slug}>
            <Link href={`/service/${service.slug}`} className="location-service-image"><img src={image} alt={imageAlt} /></Link>
            <div><span>{service.isAddOn ? "Additional service" : category.title}</span><h3><Link href={`/service/${service.slug}`}>{service.title}</Link></h3><p>{reason}</p>{service.priceNote && <small>{service.priceNote}</small>}<footer><strong>From {getServiceFromPrice(service)}</strong><Link href={`/service/${service.slug}`}>View service <ArrowRight size={16} /></Link></footer></div>
          </article>;
        })}</div>
      </div>
    </section>

    <section className="section shell location-comparison" id="compare-services">
      <div className="section-heading compact"><div><p className="kicker">Compare the core options</p><h2>What does your vehicle need?</h2></div></div>
      <div className="location-comparison-table"><table><thead><tr><th>Service</th><th>Best for</th><th>Typical scope</th><th>From</th><th><span className="sr-only">View</span></th></tr></thead><tbody>{comparisonRows.map((row) => {
        const category = categories.find((item) => item.slug === row.slug);
        if (!category) return null;
        return <tr key={row.slug}><th scope="row"><Link href={`/category/${row.slug}`}>{category.title}</Link></th><td>{row.bestFor}</td><td>{row.scope}</td><td><strong>{row.from}</strong></td><td><Link href={`/category/${row.slug}`} aria-label={`View ${category.title}`}><ArrowRight size={17} /></Link></td></tr>;
      })}</tbody></table></div>
      <p className="location-price-note">Trade bay hire starts from £50 per three-hour session. Public bay hire starts from £80 for two hours. Additional treatments are priced separately and display the required minimum main service.</p>
    </section>

    <section className="location-appointment-band">
      <div className="shell">
        <div className="section-heading compact"><div><p className="kicker">Before you travel</p><h2>A planned appointment, not a guessed package.</h2></div><p>{location.appointmentPlanning}</p></div>
        <div className="location-appointment-grid">
          <article><CalendarClock /><h3>Confirm the treatment</h3><p>Tell us about the vehicle, how it is used and the result you want. We will separate essential preparation from optional protection.</p></article>
          <article><Clock3 /><h3>Know the timing</h3><p>The expected working and completion window is agreed before your visit, particularly for polishing, restoration and coating work.</p></article>
          <article><MapPin /><h3>Arrive at the real facility</h3><p>Every location page leads to Unit 7 Consensus House in Norwich. We do not advertise virtual branches in the surrounding towns.</p></article>
        </div>
      </div>
    </section>

    {project && <section className="section shell location-project">
      <div className="location-project-media"><img src={(project.images[1] || project.images[0]).src} alt={(project.images[1] || project.images[0]).alt} /></div>
      <div><p className="kicker">Real workshop result</p><h2>{project.title}</h2><p>{project.summary}</p><p className="location-project-note">This is a genuine Auto Opulence project completed at the same Norwich facility used by customers travelling from {location.name}.</p><Link href={`/case-studies/${project.slug}`} className="button">Read the case study <ArrowRight size={18} /></Link></div>
    </section>}

    <section className="location-map-section">
      <div className="shell location-map-grid">
        <div><p className="kicker">Your route to Auto Opulence</p><h2>One Norwich facility.</h2><p>{location.arrival}</p><address><strong>Auto Opulence</strong><br />Unit 7 Consensus House<br />St Faiths Road<br />Norwich, Norfolk, NR6 7BW</address><a href={mapDirections} target="_blank" rel="noreferrer" className="inline-link">Open directions from {location.name} <ArrowRight size={17} /></a></div>
        <figure className="location-map-frame"><iframe title={`Map showing the route destination for Auto Opulence customers from ${location.name}`} src="https://www.google.com/maps?q=Unit+7+Consensus+House,+St+Faiths+Road,+Norwich,+NR6+7BW&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></figure>
      </div>
    </section>

    <section className="section shell location-nearby">
      <div><p className="kicker">More Norfolk service areas</p><h2>Travelling from nearby?</h2><p>Compare journey and vehicle-care guidance for other towns served by the same Norwich facility.</p></div>
      <nav aria-label="Nearby Auto Opulence service areas">{nearbyLocations.map((nearby) => <Link href={`/locations/${nearby.slug}`} key={nearby.slug}><MapPin size={18} /><span><strong>{nearby.name}</strong>View local service guide</span><ArrowRight size={17} /></Link>)}</nav>
    </section>

    <section className="section shell faq-section"><div><p className="kicker">{location.name} FAQs</p><h2>Before you travel.</h2></div><div className="faq-list">{location.faqs.map((faq, index) => <details key={faq.question} open={index === 0}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>

    <section className="location-cta"><div className="shell"><div><p className="kicker">Vehicle care for {location.name}</p><h2>Tell us what your vehicle needs.</h2><p>Choose a service online or send an enquiry for help selecting the correct wash, valet, correction, coating or bay-hire package.</p></div><div><Link href="/#book" className="button">Book a service <ArrowRight size={18} /></Link><Link href="/contact" className="location-secondary-button">Ask a question</Link></div></div></section>
  </main><Footer /></>;
}
