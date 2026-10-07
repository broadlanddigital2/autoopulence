// The site's routes. Static pages map a URL to a page file in source/app; dynamic pages map a URL prefix
// to a [slug] page whose generateStaticParams() lists the slugs. Add new pages here.
export const staticPages = {
  "/": "app/page",
  "/about": "app/about/page",
  "/account": "app/account/page",
  "/booking-complete": "app/booking-complete/page",
  "/booking/payment-complete": "app/booking/payment-complete/page",
  "/business-sectors": "app/business-sectors/page",
  "/case-studies": "app/case-studies/page",
  "/contact": "app/contact/page",
  "/cookies": "app/cookies/page",
  "/enquiry-complete": "app/enquiry-complete/page",
  "/gallery": "app/gallery/page",
  "/guides": "app/guides/page",
  "/locations": "app/locations/page",
  "/login": "app/login/page",
  "/privacy": "app/privacy/page",
  "/services": "app/services/page",
  "/signup": "app/signup/page",
};
export const dynamicPages = {
  "/business-sectors": "app/business-sectors/[slug]/page",
  "/case-studies": "app/case-studies/[slug]/page",
  "/category": "app/category/[slug]/page",
  "/guides": "app/guides/[slug]/page",
  "/locations": "app/locations/[slug]/page",
  "/service": "app/service/[slug]/page",
};
