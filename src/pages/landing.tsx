import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, Server } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container mx-auto px-4 h-20 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground">
          <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`} alt="Logo" className="w-8 h-8" />
          <span>Order Hub</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/sign-in">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link to="/sign-up">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <Badge className="mb-6 px-3 py-1 bg-primary/10 text-primary border-primary/20">Operations Cockpit v1.0</Badge>
        <h1 className="max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
          The ultimate control center for <span className="text-primary relative inline-block">
            Indian Sellers
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
          </span>
        </h1>
        <p className="max-w-2xl text-xl text-muted-foreground mb-10 leading-relaxed">
          Unify your Meesho, Flipkart, and Amazon operations. Dense KPIs, bulk uploads, and lightning-fast inventory management. Built for speed.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link to="/sign-up">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full">
              Start Building Today
            </Button>
          </Link>
          <Link to="/sign-in">
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full">
              View Demo
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl w-full text-left">
          <FeatureCard
            icon={<Package className="w-6 h-6 text-[#e83e8c]" />}
            title="Multi-Platform"
            description="Sync orders across Meesho, Flipkart, and Amazon automatically."
          />
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6 text-[#007bff]" />}
            title="KPIs at a Glance"
            description="Revenue, top SKUs, and volume breakdowns updated in real-time."
          />
          <FeatureCard
            icon={<Server className="w-6 h-6 text-[#fd7e14]" />}
            title="Bulk Operations"
            description="Drop in .xlsx files to import thousands of rows instantly without blocking."
          />
        </div>
      </main>

      <footer className="py-8 text-center text-muted-foreground text-sm border-t border-border/40">
        <p>© {new Date().getFullYear()} Order Hub. Designed for high-volume sellers.</p>
      </footer>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-card-border shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
