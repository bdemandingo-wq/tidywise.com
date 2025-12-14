import { Leaf, ShieldCheck, Clock } from "lucide-react";

const features = [
  {
    icon: Leaf,
    title: "Eco-Friendly Products",
    description: "We use only non-toxic, environmentally safe cleaning products.",
  },
  {
    icon: ShieldCheck,
    title: "Trained Professionals",
    description: "Our team is thoroughly vetted, trained, and insured.",
  },
  {
    icon: Clock,
    title: "Flexible Scheduling",
    description: "We work around your schedule, not the other way around.",
  },
];

const WhyChooseUs = () => {
  return (
    <section id="about" className="py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose TIDYWISE?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're not just another cleaning service. We're your partners in creating a healthier, happier home environment.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Team Image */}
        <div className="max-w-4xl mx-auto">
          <div className="rounded-xl overflow-hidden shadow-elevated">
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
              alt="Professional cleaning team at work"
              className="w-full h-80 object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
