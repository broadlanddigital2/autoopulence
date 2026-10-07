import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getServiceFromPrice, type Category, type Service } from "@/lib/services";
import { getServiceCardImage, getServiceImageAlt } from "@/lib/category-presentation";
import { getLowestPackagePrice } from "@/lib/booking-services";

export function ServiceCard({ category, service }: { category: Category; service: Service; index: number }) {
  const image = getServiceCardImage(service.slug, category.image);
  const imageAlt = getServiceImageAlt(service.slug, `${service.title} at Auto Opulence in Norwich`);
  const packageFrom = getLowestPackagePrice(service.slug);
  const hasPackagePrice = packageFrom !== undefined;

  return (
    <article className={`service-card${hasPackagePrice ? " has-package-price" : ""}`}>
      <Link href={`/service/${service.slug}`} aria-label={`View ${service.title}`}>
        <div className="service-card-image">
          <img src={image} alt={imageAlt} width="1672" height="941" loading="lazy" decoding="async" />
          <span className={`service-kind${service.isAddOn ? " is-add-on" : ""}`}>
            {service.isAddOn ? "Additional service" : "Main service"}
          </span>
        </div>
        <div className="service-card-body">
          <div className="service-card-copy">
            <h3>{service.title}</h3>
            <p>{service.short}</p>
          </div>
          <div className="service-card-footer">
            <div className="service-price-options">
              <div className="service-from">
                <span>{service.isAddOn ? "Additional cost from" : "From"}</span>
                <strong>{getServiceFromPrice(service)}</strong>
              </div>
              {hasPackagePrice && (
                <div className="service-from service-from--package">
                  <span>Package from</span>
                  <strong>£{packageFrom}</strong>
                  <small>per visit</small>
                </div>
              )}
            </div>
            <span className="service-card-view">
              View <ArrowUpRight size={16} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
