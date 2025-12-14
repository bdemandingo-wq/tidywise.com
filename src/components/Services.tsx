import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Home, Truck, Building2, Check } from "lucide-react";

const services = [
  {
    icon: Sparkles,
    title: "Standard Cleaning",
    description: "Perfect for regular maintenance cleaning to keep your home spotless.",
    price: "From $150",
    features: [
      "All rooms dusted & vacuumed",
      "Kitchen & bathrooms sanitized",
      "Floors mopped",
      "Trash emptied",
    ],
  },
  {
    icon: Home,
    title: "Deep Cleaning",
    description: "Comprehensive cleaning for homes that need extra attention to detail.",
    price: "From $250",
    features: [
      "Everything in Standard Cleaning",
      "Baseboards & trim cleaned",
      "Light switches & door handles",
      "Inside cabinets & drawers",
    ],
  },
  {
    icon: Truck,
    title: "Move In/Out",
    description: "Perfect for moving - we leave your old or new home spotless.",
    price: "From $300",
    features: [
      "Complete top-to-bottom cleaning",
      "Inside appliances cleaned",
      "Windows & tracks cleaned",
      "Ready for move-in inspection",
    ],
  },
  {
    icon: Building2,
    title: "Commercial",
    description: "Professional cleaning for offices, retail spaces, and commercial properties.",
    price: "Custom Quote",
    features: [
      "Flexible scheduling",
      "OSHA compliant cleaning",
      "Janitorial services",
      "Floor care & maintenance",
    ],
  },
];

const Services = () => {
  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our Premium Services
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From standard maintenance to deep cleaning, we offer comprehensive solutions for every need.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Card
              key={service.title}
              className="hover-lift border-border/50 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-display text-xl">{service.title}</CardTitle>
                <p className="text-muted-foreground text-sm">{service.description}</p>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary mb-4">{service.price}</p>
                <ul className="space-y-2">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
