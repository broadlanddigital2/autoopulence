import { CrmBooking } from "@/components/crm-booking";

export function BookingWidget({
  initialCategory = "vehicle-valeting",
  initialService = "",
}: {
  initialCategory?: string;
  initialService?: string;
}) {
  return <div className="ao-booking booking-panel" id="book">
    <header className="ao-booking-head">
      <div>
        <p className="kicker">Book Auto Opulence</p>
        <h2>Book and pay securely.</h2>
        <p>Choose your service, select a live appointment and complete payment through our secure Stripe checkout.</p>
      </div>
    </header>
    <CrmBooking mode="form" category={initialCategory} service={initialService} />
  </div>;
}
