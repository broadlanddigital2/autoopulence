// The CRM booking widget (crm.racecargraphics.uk/embed/booking.js): the same booking form, payment receipt, login and
// customer account as every other brand site. All booking rules live in the CRM; this only places it on the page.
// The build adds the widget script to any page that contains one of these.
export const AUTO_OPULENCE_BUSINESS = "8a8a2f45-ff2e-4d60-867c-329406513c95";

type Mode = "form" | "payment-complete" | "login" | "account";
export function CrmBooking({ mode, service, category }: { mode: Mode; service?: string; category?: string }) {
  return <div
    data-crm-booking={mode}
    data-business={AUTO_OPULENCE_BUSINESS}
    data-service={service || undefined}
    data-category={category || undefined}
    data-address-lookup="/api/address-lookup"
    data-privacy-url="/privacy"
    data-contact-url="/contact"
    data-account-url="/account"
    data-booking-url="/#book"
    data-payment-url="/booking/payment-complete"
    className="crm-booking"
  />;
}
